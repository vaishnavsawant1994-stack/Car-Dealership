import 'server-only'

import { randomUUID } from 'node:crypto'
import { Prisma, VehicleStatus, WorkshopChecklistCode, WorkshopJobType, WorkshopOrderStatus } from '@prisma/client'
import type { AdminActor } from '@/lib/auth/require-admin'
import { accessibleResourceWhere, showroomScopeWhere } from '@/lib/auth/admin-resource-policy'
import { getActorShowroomScope } from '@/lib/auth/showroom-scope'
import { prisma } from '@/lib/db/prisma'

const checklistCodes = Object.values(WorkshopChecklistCode)
const orderSelect = {
  id: true, referenceNumber: true, jobType: true, status: true, version: true, createdAt: true, updatedAt: true,
  vehicle: { select: { id: true, shortTitle: true, stockNumber: true, year: true } },
  showroom: { select: { id: true, name: true } },
  assignedTo: { select: { id: true, name: true } },
  checklist: { orderBy: { code: 'asc' as const }, select: { id: true, code: true, completedAt: true, completedById: true, version: true } },
}

function orderReference() {
  return `WRK-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 8).toUpperCase()}`
}

function scopedWorkshopOrderWhere(actor: AdminActor, scope: Awaited<ReturnType<typeof getActorShowroomScope>>) {
  return {
    ...accessibleResourceWhere(actor, scope),
    ...(!scope.global ? { vehicle: { is: { showroomId: { in: [...scope.showroomIds] } } } } : {}),
  }
}

export async function listWorkshopOrders(actor: AdminActor) {
  const scope = await getActorShowroomScope(actor)
  return prisma.workshopOrder.findMany({ where: scopedWorkshopOrderWhere(actor, scope), select: orderSelect,
    take: 100, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }] })
}

export async function listEligibleWorkshopVehicles(actor: AdminActor) {
  const scope = await getActorShowroomScope(actor)
  return prisma.vehicle.findMany({
    where: { status: VehicleStatus.SOLD, ...showroomScopeWhere(scope),
      workshopOrders: { none: { status: { in: [WorkshopOrderStatus.OPEN, WorkshopOrderStatus.SCHEDULED, WorkshopOrderStatus.IN_PROGRESS] } } } },
    select: { id: true, shortTitle: true, stockNumber: true, year: true, showroom: { select: { name: true } } },
    take: 100, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
  })
}

export async function createWorkshopOrder(vehicleId: string, actor: AdminActor, jobType: WorkshopJobType) {
  const scope = await getActorShowroomScope(actor)
  try {
    return await prisma.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.findFirst({ where: { id: vehicleId, status: VehicleStatus.SOLD, ...showroomScopeWhere(scope) },
        select: { id: true, status: true, showroomId: true, shortTitle: true } })
      if (!vehicle) return { type: 'not-available' as const }
      const order = await tx.workshopOrder.create({
        data: { referenceNumber: orderReference(), vehicleId, showroomId: vehicle.showroomId,
          assignedToId: actor.id, createdById: actor.id, jobType,
          checklist: { create: checklistCodes.map((code) => ({ code })) } },
        select: orderSelect,
      })
      await tx.auditLog.create({ data: { actorId: actor.id, action: 'WORKSHOP_ORDER_OPENED', entity: 'WorkshopOrder', entityId: order.id,
        resourceType: 'Vehicle', resourceId: vehicle.id, summary: 'Opened an internal workshop job card.',
        metadata: { referenceNumber: order.referenceNumber, jobType, status: order.status } } })
      return { type: 'created' as const, data: order }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return { type: 'already-active' as const }
    throw error
  }
}

export async function updateWorkshopChecklist(
  id: string, actor: AdminActor, input: { code: WorkshopChecklistCode; completed: boolean; version: number },
) {
  const scope = await getActorShowroomScope(actor)
  return prisma.$transaction(async (tx) => {
    const order = await tx.workshopOrder.findFirst({ where: { id, status: { in: [WorkshopOrderStatus.OPEN, WorkshopOrderStatus.SCHEDULED, WorkshopOrderStatus.IN_PROGRESS] },
      ...scopedWorkshopOrderWhere(actor, scope) }, select: { id: true } })
    if (!order) return { type: 'not-available' as const }
    const item = await tx.workshopChecklistEntry.findUnique({ where: { workshopOrderId_code: { workshopOrderId: id, code: input.code } } })
    if (!item) return { type: 'not-available' as const }
    if (item.version !== input.version) return { type: 'conflict' as const }
    const updated = await tx.workshopChecklistEntry.updateMany({ where: { id: item.id, version: input.version },
      data: { completedAt: input.completed ? new Date() : null, completedById: input.completed ? actor.id : null, version: { increment: 1 } } })
    if (!updated.count) return { type: 'conflict' as const }
    await tx.workshopOrder.update({ where: { id }, data: { version: { increment: 1 } } })
    await tx.auditLog.create({ data: { actorId: actor.id, action: 'WORKSHOP_CHECKLIST_UPDATED', entity: 'WorkshopChecklistEntry', entityId: item.id,
      resourceType: 'WorkshopOrder', resourceId: id, summary: 'Updated a workshop checklist item.',
      metadata: { code: input.code, completed: input.completed } } })
    return { type: 'updated' as const }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
}

export async function transitionWorkshopOrder(
  id: string, actor: AdminActor, input: { version: number; status: WorkshopOrderStatus },
) {
  const scope = await getActorShowroomScope(actor)
  return prisma.$transaction(async (tx) => {
    const order = await tx.workshopOrder.findFirst({ where: { id, ...scopedWorkshopOrderWhere(actor, scope) },
      select: { id: true, vehicleId: true, status: true, version: true } })
    if (!order) return { type: 'not-available' as const }
    if (order.version !== input.version) return { type: 'conflict' as const }
    const allowed = (order.status === WorkshopOrderStatus.OPEN && [WorkshopOrderStatus.SCHEDULED, WorkshopOrderStatus.CANCELLED].some((status) => status === input.status)) ||
      (order.status === WorkshopOrderStatus.SCHEDULED && [WorkshopOrderStatus.IN_PROGRESS, WorkshopOrderStatus.CANCELLED].some((status) => status === input.status)) ||
      (order.status === WorkshopOrderStatus.IN_PROGRESS && input.status === WorkshopOrderStatus.COMPLETED)
    if (!allowed) return { type: 'invalid-transition' as const }
    if (input.status === WorkshopOrderStatus.COMPLETED) {
      const checks = await tx.workshopChecklistEntry.findMany({ where: { workshopOrderId: id }, select: { completedAt: true } })
      if (checks.length !== checklistCodes.length || checks.some((check) => !check.completedAt)) return { type: 'checks-incomplete' as const }
    }
    const changed = await tx.workshopOrder.updateMany({ where: { id, version: input.version, status: order.status },
      data: { status: input.status, version: { increment: 1 } } })
    if (!changed.count) return { type: 'conflict' as const }
    await tx.auditLog.create({ data: { actorId: actor.id, action: 'WORKSHOP_ORDER_STATUS_CHANGED', entity: 'WorkshopOrder', entityId: id,
      resourceType: 'Vehicle', resourceId: order.vehicleId, summary: 'Changed the workshop job card status.',
      metadata: { fromStatus: order.status, toStatus: input.status } } })
    return { type: 'updated' as const }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
}
