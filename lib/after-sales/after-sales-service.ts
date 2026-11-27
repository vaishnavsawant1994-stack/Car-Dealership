import 'server-only'

import { AfterSalesTaskStatus, AfterSalesTaskType, DeliveryCaseStatus, Prisma } from '@prisma/client'
import type { AdminActor } from '@/lib/auth/require-admin'
import { showroomScopeWhere } from '@/lib/auth/admin-resource-policy'
import { getActorShowroomScope } from '@/lib/auth/showroom-scope'
import { prisma } from '@/lib/db/prisma'

function linkedVehicleScope(scope: Awaited<ReturnType<typeof getActorShowroomScope>>) {
  return scope.global ? {} : { vehicle: { is: { showroomId: { in: [...scope.showroomIds] } } } }
}

function scopedDeliveryCaseWhere(scope: Awaited<ReturnType<typeof getActorShowroomScope>>) {
  return { ...showroomScopeWhere(scope), ...linkedVehicleScope(scope) }
}

function scopedAfterSalesTaskWhere(scope: Awaited<ReturnType<typeof getActorShowroomScope>>) {
  return {
    ...showroomScopeWhere(scope),
    ...(!scope.global ? { deliveryCase: { is: { vehicle: linkedVehicleScope(scope) } } } : {}),
  }
}

const taskSelect = {
  id: true, type: true, status: true, dueAt: true, completedAt: true, version: true, createdAt: true,
  deliveryCase: { select: { id: true, referenceNumber: true, vehicle: { select: { shortTitle: true, stockNumber: true, year: true } } } },
  showroom: { select: { id: true, name: true } }, assignedTo: { select: { id: true, name: true } },
}

export async function listAfterSalesTasks(actor: AdminActor) {
  const scope = await getActorShowroomScope(actor)
  return prisma.afterSalesTask.findMany({ where: scopedAfterSalesTaskWhere(scope), select: taskSelect, take: 200,
    orderBy: [{ status: 'asc' }, { dueAt: 'asc' }, { id: 'asc' }] })
}

export async function listEligibleDeliveredCases(actor: AdminActor) {
  const scope = await getActorShowroomScope(actor)
  return prisma.deliveryCase.findMany({ where: { status: DeliveryCaseStatus.HANDED_OVER, showroomId: { not: null }, ...scopedDeliveryCaseWhere(scope) },
    select: { id: true, referenceNumber: true, showroom: { select: { name: true } }, vehicle: { select: { shortTitle: true, stockNumber: true, year: true } } },
    take: 100, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }] })
}

export async function createAfterSalesTask(input: { deliveryCaseId: string; type: AfterSalesTaskType; dueAt: string }, actor: AdminActor) {
  const dueAt = new Date(input.dueAt)
  if (!Number.isFinite(dueAt.getTime())) return { type: 'invalid-date' as const }
  const scope = await getActorShowroomScope(actor)
  try {
    return await prisma.$transaction(async (tx) => {
      const delivery = await tx.deliveryCase.findFirst({ where: { id: input.deliveryCaseId, status: DeliveryCaseStatus.HANDED_OVER,
        showroomId: { not: null }, ...scopedDeliveryCaseWhere(scope) }, select: { id: true, showroomId: true } })
      if (!delivery?.showroomId) return { type: 'not-available' as const }
      const task = await tx.afterSalesTask.create({ data: { deliveryCaseId: delivery.id, showroomId: delivery.showroomId,
        type: input.type, dueAt, assignedToId: actor.id, createdById: actor.id }, select: taskSelect })
      await tx.auditLog.create({ data: { actorId: actor.id, action: 'AFTER_SALES_TASK_CREATED', entity: 'AfterSalesTask', entityId: task.id,
        resourceType: 'DeliveryCase', resourceId: delivery.id, summary: 'Scheduled an internal after-sales care task.',
        metadata: { type: task.type, dueAt: dueAt.toISOString() } } })
      return { type: 'created' as const, data: task }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return { type: 'already-scheduled' as const }
    throw error
  }
}

export async function completeAfterSalesTask(id: string, version: number, actor: AdminActor) {
  const scope = await getActorShowroomScope(actor)
  return prisma.$transaction(async (tx) => {
    const task = await tx.afterSalesTask.findFirst({ where: { id, status: AfterSalesTaskStatus.OPEN, version, ...scopedAfterSalesTaskWhere(scope) },
      select: { id: true, deliveryCaseId: true } })
    if (!task) return { type: 'not-available' as const }
    const changed = await tx.afterSalesTask.updateMany({ where: { id, status: AfterSalesTaskStatus.OPEN, version, ...scopedAfterSalesTaskWhere(scope) },
      data: { status: AfterSalesTaskStatus.COMPLETED, completedAt: new Date(), version: { increment: 1 } } })
    if (!changed.count) return { type: 'conflict' as const }
    await tx.auditLog.create({ data: { actorId: actor.id, action: 'AFTER_SALES_TASK_COMPLETED', entity: 'AfterSalesTask', entityId: id,
      resourceType: 'DeliveryCase', resourceId: task.deliveryCaseId, summary: 'Completed an internal after-sales care task.' } })
    return { type: 'completed' as const }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
}
