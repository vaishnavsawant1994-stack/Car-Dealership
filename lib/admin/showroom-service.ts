import 'server-only'

import { Prisma, UserRole, UserStatus } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { getCarDealershipEnvironment } from '@/lib/config/isolation'
import { eligibleShowroomStaff, validateHostedShowroom } from './showroom-policy'
import type { z } from 'zod'
import { showroomSchema } from '@/lib/validation/admin'

export class ShowroomWorkflowError extends Error {
  constructor(public readonly code: string, public readonly httpStatus: number, message: string) {
    super(message)
    this.name = 'ShowroomWorkflowError'
  }
}

type Input = z.infer<typeof showroomSchema>
type UpdateInput = Input & { version: number }

function requireValidShowroom(input: Input) {
  if (input.isPrimary && !input.active) {
    throw new ShowroomWorkflowError('INVALID_PRIMARY', 400, 'The primary showroom must remain active.')
  }
  const issue = validateHostedShowroom(input, getCarDealershipEnvironment())
  if (issue) throw new ShowroomWorkflowError('DEMO_CONTACT_BLOCKED', 422, issue)
}

function mapDatabaseError(error: unknown): never {
  if (error instanceof ShowroomWorkflowError) throw error
  if (error instanceof Prisma.PrismaClientKnownRequestError &&
      ['P2002', 'P2034'].includes(error.code)) {
    throw new ShowroomWorkflowError('EDIT_CONFLICT', 409, 'A simultaneous branch change was detected. Reload and try again.')
  }
  throw error
}

const serializable = { isolationLevel: Prisma.TransactionIsolationLevel.Serializable } as const

/**
 * Serializably update the global primary showroom, increment record versions,
 * and create the audit event in the same transaction.
 */
export async function createShowroom(actorId: string, input: Input) {
  requireValidShowroom(input)
  try {
    return await prisma.$transaction(async (tx) => {
      if (input.isPrimary) {
        await tx.showroom.updateMany({
          where: { isPrimary: true },
          data: { isPrimary: false, version: { increment: 1 } },
        })
      }
      const item = await tx.showroom.create({ data: input })
      await tx.auditLog.create({
        data: { actorId, action: 'SHOWROOM_CREATED', entity: 'Showroom', entityId: item.id,
          resourceType: 'Showroom', resourceId: item.id,
          summary: 'Created dealership branch.', metadata: { isPrimary: input.isPrimary } },
      })
      return item
    }, serializable)
  } catch (error) { return mapDatabaseError(error) }
}

export async function editShowroom(actorId: string, id: string, input: UpdateInput) {
  requireValidShowroom(input)
  try {
    return await prisma.$transaction(async (tx) => {
      const current = await tx.showroom.findUnique({
        where: { id }, select: { id: true, isPrimary: true, version: true },
      })
      if (!current) throw new ShowroomWorkflowError('NOT_FOUND', 404, 'Showroom not found.')
      if (current.version !== input.version) {
        throw new ShowroomWorkflowError('EDIT_CONFLICT', 409, 'The showroom changed; reload before saving.')
      }
      if (current.isPrimary && !input.isPrimary) {
        throw new ShowroomWorkflowError('PRIMARY_REQUIRED', 409, 'Make another active showroom primary before changing this one.')
      }
      if (!input.active) {
        const count = await tx.showroomStaffAssignment.count({ where: { showroomId: id } })
        if (count > 0) {
          throw new ShowroomWorkflowError('STAFF_ASSIGNED', 409, 'Remove branch staff assignments before deactivating this showroom.')
        }
      }
      if (input.isPrimary && !current.isPrimary) {
        await tx.showroom.updateMany({
          where: { isPrimary: true, id: { not: id } },
          data: { isPrimary: false, version: { increment: 1 } },
        })
      }
      const { version, ...fields } = input
      const changed = await tx.showroom.updateMany({
        where: { id, version },
        data: { ...fields, version: { increment: 1 } },
      })
      if (changed.count !== 1) {
        throw new ShowroomWorkflowError('EDIT_CONFLICT', 409, 'The showroom changed; reload before saving.')
      }
      const updated = await tx.showroom.findUniqueOrThrow({ where: { id } })
      await tx.auditLog.create({
        data: { actorId, action: 'SHOWROOM_UPDATED', entity: 'Showroom', entityId: id,
          resourceType: 'Showroom', resourceId: id,
          summary: 'Updated dealership branch settings.', metadata: { isPrimary: updated.isPrimary, active: updated.active } },
      })
      return updated
    }, serializable)
  } catch (error) { return mapDatabaseError(error) }
}

/** Candidate list is privilege-gated in its route; no password or private phone is returned. */
export async function getShowroomStaff(showroomId: string) {
  const showroom = await prisma.showroom.findUnique({
    where: { id: showroomId },
    select: { id: true, name: true, active: true, isPrimary: true },
  })
  if (!showroom) throw new ShowroomWorkflowError('NOT_FOUND', 404, 'Showroom not found.')
  const [assignments, candidates] = await Promise.all([
    prisma.showroomStaffAssignment.findMany({
      where: { showroomId },
      orderBy: { createdAt: 'asc' },
      select: { userId: true, createdAt: true,
        user: { select: { id: true, name: true, email: true, role: true, status: true } } },
    }),
    prisma.user.findMany({
      where: { deletedAt: null, status: UserStatus.ACTIVE,
        role: { in: [UserRole.SALES, UserRole.OPERATIONS, UserRole.CONTENT_MANAGER, UserRole.ADMIN] } },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
      take: 100,
      select: { id: true, name: true, email: true, role: true },
    }),
  ])
  return { showroom, assignments, candidates }
}

export async function assignShowroomStaff(actorId: string, showroomId: string, userId: string) {
  try {
    return await prisma.$transaction(async (tx) => {
      const showroom = await tx.showroom.findUnique({ where: { id: showroomId }, select: { id: true, active: true } })
      if (!showroom) throw new ShowroomWorkflowError('NOT_FOUND', 404, 'Showroom not found.')
      if (!showroom.active) throw new ShowroomWorkflowError('BRANCH_INACTIVE', 409, 'Activate the showroom before assigning staff.')
      const user = await tx.user.findUnique({
        where: { id: userId }, select: { id: true, role: true, status: true, deletedAt: true },
      })
      if (!user || !eligibleShowroomStaff(user)) {
        throw new ShowroomWorkflowError('STAFF_INELIGIBLE', 422, 'Choose an active staff account eligible for branch assignment.')
      }
      const assignment = await tx.showroomStaffAssignment.create({
        data: { showroomId, userId },
      })
      await tx.auditLog.create({
        data: { actorId, action: 'SHOWROOM_STAFF_ASSIGNED', entity: 'Showroom', entityId: showroomId,
          resourceType: 'Showroom', resourceId: showroomId,
          summary: 'Assigned an eligible staff member to a showroom.',
          metadata: { userId } },
      })
      return assignment
    }, serializable)
  } catch (error) { return mapDatabaseError(error) }
}

export async function removeShowroomStaff(actorId: string, showroomId: string, userId: string) {
  try {
    return await prisma.$transaction(async (tx) => {
      const removed = await tx.showroomStaffAssignment.deleteMany({ where: { showroomId, userId } })
      if (removed.count !== 1) throw new ShowroomWorkflowError('ASSIGNMENT_NOT_FOUND', 404, 'This staff member is not assigned to this branch.')
      await tx.auditLog.create({
        data: { actorId, action: 'SHOWROOM_STAFF_REMOVED', entity: 'Showroom', entityId: showroomId,
          resourceType: 'Showroom', resourceId: showroomId,
          summary: 'Removed a staff assignment from a showroom.', metadata: { userId } },
      })
      return { removed: true }
    }, serializable)
  } catch (error) { return mapDatabaseError(error) }
}

export async function myActiveShowrooms(userId: string) {
  return prisma.showroomStaffAssignment.findMany({
    where: { userId, showroom: { active: true } },
    orderBy: { createdAt: 'asc' },
    select: { showroom: { select: { id: true, name: true, city: true, state: true,
      country: true, hours: true, isPrimary: true } } },
  })
}
