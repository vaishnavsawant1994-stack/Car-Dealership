import 'server-only'

import { Prisma, UserRole, UserStatus } from '@prisma/client'
import type { AdminActor } from '@/lib/auth/require-admin'
import { prisma } from '@/lib/db/prisma'
import { checkDueDate, customerFollowUpType, type CreateCustomerFollowUpInput } from './customer-followups'

/** Staff-only workflow. P1-05 may later extend this policy to branch-scoped assignees. */
export async function listCustomerFollowUps(customerId: string) {
  return prisma.operationalFollowUp.findMany({
    where: { resourceType: customerFollowUpType, resourceId: customerId },
    take: 100,
    orderBy: [{ completedAt: 'asc' }, { dueAt: 'asc' }, { id: 'asc' }],
    select: {
      id: true, title: true, dueAt: true, completedAt: true, createdAt: true,
      assignedTo: { select: { id: true, name: true } },
      createdBy: { select: { name: true } },
    },
  })
}

export async function createCustomerFollowUp(customerId: string, actor: AdminActor, input: CreateCustomerFollowUpInput) {
  const dueAt = new Date(input.dueAt)
  if (!checkDueDate(dueAt)) return { type: 'invalid-due-date' as const }
  return prisma.$transaction(async (tx) => {
    const customer = await tx.user.findFirst({
      where: { id: customerId, role: UserRole.CUSTOMER, deletedAt: null },
      select: { id: true },
    })
    if (!customer) return { type: 'not-found' as const }

    const assigneeId = input.assignedToId ?? actor.id
    // Restrict assignees to admin roles that can actually access Customer 360.
    const assignee = await tx.user.findFirst({
      where: { id: assigneeId, role: { in: [UserRole.ADMIN, UserRole.SUPER_ADMIN] },
        status: UserStatus.ACTIVE, emailVerified: { not: null }, deletedAt: null },
      select: { id: true },
    })
    if (!assignee) return { type: 'invalid-assignee' as const }

    const task = await tx.operationalFollowUp.create({
      data: {
        resourceType: customerFollowUpType, resourceId: customerId,
        title: input.title, dueAt, assignedToId: assignee.id, createdById: actor.id,
      },
      select: { id: true, title: true, dueAt: true, completedAt: true, assignedToId: true },
    })
    await tx.auditLog.create({
      data: {
        actorId: actor.id, action: 'CUSTOMER_FOLLOW_UP_CREATED',
        entity: 'OperationalFollowUp', entityId: task.id,
        resourceType: customerFollowUpType, resourceId: customerId,
        summary: 'Created an internal customer follow-up task.',
        metadata: { assignedToId: assignee.id, dueAt: dueAt.toISOString() },
      },
    })
    return { type: 'created' as const, data: task }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
}

export async function completeCustomerFollowUp(customerId: string, followUpId: string, actor: AdminActor) {
  return prisma.$transaction(async (tx) => {
    const task = await tx.operationalFollowUp.findFirst({
      where: { id: followUpId, resourceType: customerFollowUpType, resourceId: customerId },
      select: { id: true, assignedToId: true, completedAt: true },
    })
    if (!task) return { type: 'not-found' as const }
    if (task.completedAt) return { type: 'already-completed' as const }
    // Administrators may close the customer task. A future branch-scoped policy
    // can constrain this further, without exposing the generic FollowUp table.
    const updated = await tx.operationalFollowUp.updateMany({
      where: { id: followUpId, resourceType: customerFollowUpType, resourceId: customerId, completedAt: null },
      data: { completedAt: new Date() },
    })
    if (!updated.count) return { type: 'already-completed' as const }
    await tx.auditLog.create({
      data: {
        actorId: actor.id, action: 'CUSTOMER_FOLLOW_UP_COMPLETED',
        entity: 'OperationalFollowUp', entityId: followUpId,
        resourceType: customerFollowUpType, resourceId: customerId,
        summary: 'Closed an internal customer follow-up task.',
      },
    })
    return { type: 'completed' as const }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
}
