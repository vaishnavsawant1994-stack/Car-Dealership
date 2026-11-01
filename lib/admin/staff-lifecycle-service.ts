import 'server-only'

import { Prisma, UserRole, UserStatus } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { getCarDealershipEnvironment } from '@/lib/config/isolation'
import { canManageUser } from '@/lib/auth/admin-resource-policy'
import { wouldRemoveLastSuperAdmin } from '@/lib/admin/staff-security'
import {
  canActivateStaff, isProtectedSelfChange, isStaffAccount,
  mayManageInvitationRole, shouldRemoveShowroomAssignments,
  staffLifecycleSchema,
} from './staff-lifecycle-policy'
import type { z } from 'zod'

type Actor = { id: string; role: UserRole }
type Change = z.infer<typeof staffLifecycleSchema>

export class StaffLifecycleError extends Error {
  constructor(public readonly code: string, public readonly status: number, message: string) {
    super(message)
    this.name = 'StaffLifecycleError'
  }
}

const serializable = { isolationLevel: Prisma.TransactionIsolationLevel.Serializable } as const

function remap(error: unknown): never {
  if (error instanceof StaffLifecycleError) throw error
  if (error instanceof Prisma.PrismaClientKnownRequestError &&
      ['P2002', 'P2034'].includes(error.code)) {
    throw new StaffLifecycleError('EDIT_CONFLICT', 409, 'Concurrent staff change detected; refresh before trying again.')
  }
  throw error
}

const staffResult = {
  id: true, name: true, email: true, phone: true, role: true, status: true,
  emailVerified: true, lastLoginAt: true, createdAt: true,
  sessionVersion: true,
} as const

/**
 * Role, status, session invalidation, branch assignment removal and audit
 * must either ALL commit or ALL roll back. JWT sessionVersion is used as an
 * optimistic revision: only the newest staff edit may succeed.
 */
export async function changeStaffLifecycle(actor: Actor, userId: string, update: Change) {
  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } })
      if (!user || !isStaffAccount(user)) throw new StaffLifecycleError('NOT_FOUND', 404, 'Staff account not found.')
      if (!canManageUser(actor, user)) throw new StaffLifecycleError('FORBIDDEN', 403, 'Your role cannot change this staff account.')
      if (update.version !== user.sessionVersion) {
        throw new StaffLifecycleError('EDIT_CONFLICT', 409, 'This staff account changed; reload before updating.')
      }

      if (update.role !== undefined && update.role !== user.role && actor.role !== UserRole.SUPER_ADMIN) {
        throw new StaffLifecycleError('FORBIDDEN', 403, 'Only a Super Admin can change staff roles.')
      }
      if (isProtectedSelfChange(actor.id, user.id, user.role, update, user.status)) {
        throw new StaffLifecycleError('SELF_CHANGE_BLOCKED', 409, 'You cannot alter your own role or account status.')
      }

      const nextRole = update.role ?? user.role
      const nextStatus = update.status ?? user.status
      if (nextRole === user.role && nextStatus === user.status) {
        throw new StaffLifecycleError('NO_CHANGE', 409, 'There is no role or status change to save.')
      }
      if (nextStatus === UserStatus.ACTIVE && user.status !== UserStatus.ACTIVE &&
          !canActivateStaff(user, getCarDealershipEnvironment())) {
        throw new StaffLifecycleError('PROVISIONING_REQUIRED', 409,
          'Activation requires a verified account with approved credentials; hosted demo accounts use the controlled provisioning workflow.')
      }

      if (wouldRemoveLastSuperAdmin(user, { role: nextRole, status: nextStatus },
        await tx.user.count({ where: { role: UserRole.SUPER_ADMIN,
          status: UserStatus.ACTIVE, deletedAt: null } }))) {
        throw new StaffLifecycleError('LAST_SUPER_ADMIN', 409, 'The last active Super Admin must remain available.')
      }

      const updated = await tx.user.updateMany({
        where: { id: user.id, sessionVersion: update.version, deletedAt: null },
        data: { role: nextRole, status: nextStatus, sessionVersion: { increment: 1 } },
      })
      if (updated.count !== 1) {
        throw new StaffLifecycleError('EDIT_CONFLICT', 409, 'Staff revision conflict.')
      }

      // JWTs and persisted sessions are invalidated on EVERY role or status
      // mutation, not only when status changes.
      await tx.session.deleteMany({ where: { userId } })
      const removed = shouldRemoveShowroomAssignments({ role: nextRole, status: nextStatus }, user)
        ? await tx.showroomStaffAssignment.deleteMany({ where: { userId } })
        : { count: 0 }

      await tx.auditLog.create({
        data: { actorId: actor.id, action: nextRole !== user.role ? 'USER_ROLE_CHANGED' : 'USER_STATUS_CHANGED',
          entity: 'User', entityId: userId, resourceType: 'User', resourceId: userId,
          summary: 'Staff account lifecycle updated and sessions revoked.',
          metadata: { previousRole: user.role, nextRole, previousStatus: user.status, nextStatus,
            removedShowroomAssignments: removed.count, sessionsRevoked: true } },
      })
      return tx.user.findUniqueOrThrow({ where: { id: userId }, select: staffResult })
    }, serializable)
  } catch (error) { return remap(error) }
}

export async function revokeStaffSessions(actor: Actor, userId: string) {
  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } })
      if (!user || !isStaffAccount(user)) throw new StaffLifecycleError('NOT_FOUND', 404, 'Staff account not found.')
      // A Super Admin can revoke their own sessions, but not alter their own
      // critical role. Other accounts use the ordinary protected-user rule.
      if (actor.id !== user.id && !canManageUser(actor, user)) {
        throw new StaffLifecycleError('FORBIDDEN', 403, 'Cannot revoke this protected account.')
      }
      await tx.session.deleteMany({ where: { userId } })
      await tx.user.update({ where: { id: userId }, data: { sessionVersion: { increment: 1 } } })
      await tx.auditLog.create({
        data: { actorId: actor.id, action: 'SESSIONS_REVOKED',
          entity: 'User', entityId: userId, resourceType: 'User', resourceId: userId,
          summary: 'Revoked all staff login sessions.' },
      })
      return { revoked: true }
    }, serializable)
  } catch (error) { return remap(error) }
}

/** Lists only safe invitation metadata; token and tokenHash never leave the DB. */
export async function listStaffInvitations(actorRole: UserRole) {
  return prisma.staffInvitation.findMany({
    where: actorRole === UserRole.SUPER_ADMIN ? {} : { role: { notIn: [UserRole.ADMIN, UserRole.SUPER_ADMIN] } },
    orderBy: { createdAt: 'desc' },
    take: 80,
    select: {
      id: true, email: true, role: true, createdAt: true,
      expiresAt: true, usedAt: true, revokedAt: true,
    },
  })
}

export async function revokeStaffInvitation(actor: Actor, invitationId: string, reason?: string) {
  try {
    return await prisma.$transaction(async (tx) => {
      const invitation = await tx.staffInvitation.findUnique({
        where: { id: invitationId },
        select: { id: true, role: true, usedAt: true, revokedAt: true, expiresAt: true },
      })
      if (!invitation) throw new StaffLifecycleError('NOT_FOUND', 404, 'Invitation not found.')
      if (!mayManageInvitationRole(actor.role, invitation.role)) {
        throw new StaffLifecycleError('FORBIDDEN', 403, 'Cannot manage this privileged invitation.')
      }
      const revoked = await tx.staffInvitation.updateMany({
        where: { id: invitationId, usedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
        data: { revokedAt: new Date() },
      })
      if (revoked.count !== 1) {
        throw new StaffLifecycleError('INVITATION_UNAVAILABLE', 409, 'Invitation already used, expired or revoked.')
      }
      await tx.auditLog.create({
        data: { actorId: actor.id, action: 'STAFF_INVITATION_REVOKED',
          entity: 'StaffInvitation', entityId: invitationId, resourceType: 'StaffInvitation', resourceId: invitationId,
          summary: 'Staff invitation revoked.',
          metadata: { role: invitation.role, ...(reason ? { reason } : {}) } },
      })
      return { revoked: true }
    }, serializable)
  } catch (error) { return remap(error) }
}
