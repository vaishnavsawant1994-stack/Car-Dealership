import 'server-only'

import { randomUUID } from 'node:crypto'
import { DeliveryCaseStatus, DeliveryChecklistCode, Prisma, SalesDealStatus, UserRole, VehicleStatus } from '@prisma/client'
import type { AdminActor } from '@/lib/auth/require-admin'
import { accessibleResourceWhere, showroomScopeWhere } from '@/lib/auth/admin-resource-policy'
import { getActorShowroomScope } from '@/lib/auth/showroom-scope'
import { prisma } from '@/lib/db/prisma'

const checklistCodes = Object.values(DeliveryChecklistCode)
const deliverySelect = {
  id: true, referenceNumber: true, status: true, version: true, createdAt: true, updatedAt: true,
  vehicle: { select: { id: true, shortTitle: true, stockNumber: true, status: true } },
  deal: { select: { id: true, referenceNumber: true } },
  showroom: { select: { id: true, name: true } },
  items: { orderBy: { code: 'asc' as const }, select: { id: true, code: true, completedAt: true, completedById: true, version: true } },
}

function deliveryReference() {
  return `DLV-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 8).toUpperCase()}`
}

class DeliveryTransactionConflict extends Error {}

function deliveryWhere(actor: AdminActor, scope: Awaited<ReturnType<typeof getActorShowroomScope>>) {
  const resourceScope = actor.role === UserRole.FINANCE || actor.role === UserRole.OPERATIONS
    ? showroomScopeWhere(scope)
    : accessibleResourceWhere(actor, scope)
  return {
    ...resourceScope,
    ...(!scope.global ? { vehicle: { is: { showroomId: { in: [...scope.showroomIds] } } } } : {}),
  }
}

export async function listDeliveryCases(actor: AdminActor) {
  const scope = await getActorShowroomScope(actor)
  return prisma.deliveryCase.findMany({
    where: deliveryWhere(actor, scope), select: deliverySelect, take: 100,
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
  })
}

export async function listEligibleDealsForDelivery(actor: AdminActor) {
  const scope = await getActorShowroomScope(actor)
  return prisma.salesDeal.findMany({
    where: { status: SalesDealStatus.WON, ...deliveryWhere(actor, scope), deliveryCase: null,
      invoiceDraft: { is: { status: 'DRAFT' } } },
    select: { id: true, referenceNumber: true, vehicle: { select: { shortTitle: true, stockNumber: true, status: true } } },
    take: 100, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
  })
}

export async function createDeliveryCase(dealId: string, actor: AdminActor) {
  const scope = await getActorShowroomScope(actor)
  try {
    return await prisma.$transaction(async (tx) => {
      const deal = await tx.salesDeal.findFirst({
        where: { id: dealId, status: SalesDealStatus.WON, ...deliveryWhere(actor, scope), deliveryCase: null,
          invoiceDraft: { is: { status: 'DRAFT' } } },
        select: { id: true, referenceNumber: true, vehicleId: true, showroomId: true, assignedToId: true,
          vehicle: { select: { status: true, version: true } } },
      })
      if (!deal || deal.vehicle.status !== VehicleStatus.AVAILABLE) return { type: 'not-available' as const }
      const reservation = await tx.vehicle.updateMany({
        where: { id: deal.vehicleId, status: VehicleStatus.AVAILABLE, version: deal.vehicle.version },
        data: { status: VehicleStatus.RESERVED, version: { increment: 1 } },
      })
      if (!reservation.count) return { type: 'conflict' as const }
      const created = await tx.deliveryCase.create({
        data: {
          referenceNumber: deliveryReference(), dealId: deal.id, vehicleId: deal.vehicleId,
          showroomId: deal.showroomId, assignedToId: actor.id, createdById: actor.id,
          items: { create: checklistCodes.map((code) => ({ code })) },
        },
        select: deliverySelect,
      })
      await tx.vehicleStatusHistory.create({ data: { vehicleId: deal.vehicleId, fromStatus: VehicleStatus.AVAILABLE,
        toStatus: VehicleStatus.RESERVED, reason: 'DELIVERY_PREPARATION', actorId: actor.id } })
      await tx.auditLog.create({ data: { actorId: actor.id, action: 'DELIVERY_CASE_OPENED', entity: 'DeliveryCase', entityId: created.id,
        resourceType: 'SalesDeal', resourceId: deal.id, summary: 'Opened a delivery preparation case and reserved the vehicle.',
        metadata: { status: created.status, vehicleId: deal.vehicleId } } })
      return { type: 'created' as const, data: created }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return { type: 'conflict' as const }
    throw error
  }
}

export async function updateDeliveryChecklistItem(
  deliveryCaseId: string, actor: AdminActor,
  input: { code: DeliveryChecklistCode; completed: boolean; version: number },
) {
  const scope = await getActorShowroomScope(actor)
  if (input.code === DeliveryChecklistCode.CLEARED_PAYMENT_VERIFIED && actor.role !== UserRole.FINANCE && actor.role !== UserRole.ADMIN && actor.role !== UserRole.SUPER_ADMIN) {
    return { type: 'forbidden' as const }
  }
  if (input.code !== DeliveryChecklistCode.CLEARED_PAYMENT_VERIFIED && actor.role === UserRole.FINANCE) return { type: 'forbidden' as const }
  return prisma.$transaction(async (tx) => {
    const delivery = await tx.deliveryCase.findFirst({ where: { id: deliveryCaseId, status: DeliveryCaseStatus.PREPARING,
      ...deliveryWhere(actor, scope) }, select: { id: true } })
    if (!delivery) return { type: 'not-available' as const }
    const item = await tx.deliveryChecklistEntry.findUnique({ where: { deliveryCaseId_code: { deliveryCaseId, code: input.code } } })
    if (!item) return { type: 'not-available' as const }
    if (item.version !== input.version) return { type: 'conflict' as const }
    const updated = await tx.deliveryChecklistEntry.updateMany({
      where: { id: item.id, version: input.version },
      data: { completedAt: input.completed ? new Date() : null, completedById: input.completed ? actor.id : null, version: { increment: 1 } },
    })
    if (!updated.count) return { type: 'conflict' as const }
    await tx.deliveryCase.update({ where: { id: deliveryCaseId }, data: { version: { increment: 1 } } })
    await tx.auditLog.create({ data: { actorId: actor.id, action: 'DELIVERY_CHECKLIST_UPDATED', entity: 'DeliveryChecklistEntry', entityId: item.id,
      resourceType: 'DeliveryCase', resourceId: deliveryCaseId, summary: 'Updated a delivery preparation checklist item.',
      metadata: { code: input.code, completed: input.completed } } })
    return { type: 'updated' as const }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
}

export async function transitionDeliveryCase(
  deliveryCaseId: string, actor: AdminActor, input: { version: number; status: DeliveryCaseStatus; customerAcknowledged?: boolean },
) {
  const scope = await getActorShowroomScope(actor)
  try { return await prisma.$transaction(async (tx) => {
    const delivery = await tx.deliveryCase.findFirst({ where: { id: deliveryCaseId, ...deliveryWhere(actor, scope) },
      select: { id: true, dealId: true, vehicleId: true, status: true, version: true } })
    if (!delivery) return { type: 'not-available' as const }
    if (delivery.version !== input.version) return { type: 'conflict' as const }
    if (input.status === DeliveryCaseStatus.READY_FOR_HANDOVER) {
      if (delivery.status !== DeliveryCaseStatus.PREPARING || actor.role === UserRole.FINANCE) return { type: 'invalid-transition' as const }
      const checks = await tx.deliveryChecklistEntry.findMany({ where: { deliveryCaseId }, select: { code: true, completedAt: true, completedById: true } })
      if (checks.length !== checklistCodes.length || checks.some((check) => !check.completedAt) ||
        checks.find((check) => check.code === DeliveryChecklistCode.CLEARED_PAYMENT_VERIFIED)?.completedById === actor.id) {
        return { type: 'checks-incomplete' as const }
      }
      const changed = await tx.deliveryCase.updateMany({ where: { id: deliveryCaseId, status: DeliveryCaseStatus.PREPARING, version: input.version },
        data: { status: DeliveryCaseStatus.READY_FOR_HANDOVER, version: { increment: 1 } } })
      if (!changed.count) return { type: 'conflict' as const }
    } else if (input.status === DeliveryCaseStatus.HANDED_OVER) {
      if (delivery.status !== DeliveryCaseStatus.READY_FOR_HANDOVER || actor.role === UserRole.FINANCE || input.customerAcknowledged !== true) return { type: 'invalid-transition' as const }
      const vehicle = await tx.vehicle.updateMany({ where: { id: delivery.vehicleId, status: VehicleStatus.RESERVED },
        data: { status: VehicleStatus.SOLD, published: false, version: { increment: 1 } } })
      if (!vehicle.count) throw new DeliveryTransactionConflict()
      const changed = await tx.deliveryCase.updateMany({ where: { id: deliveryCaseId, status: DeliveryCaseStatus.READY_FOR_HANDOVER, version: input.version },
        data: { status: DeliveryCaseStatus.HANDED_OVER, version: { increment: 1 } } })
      if (!changed.count) throw new DeliveryTransactionConflict()
      await tx.vehicleStatusHistory.create({ data: { vehicleId: delivery.vehicleId, fromStatus: VehicleStatus.RESERVED,
        toStatus: VehicleStatus.SOLD, reason: 'CUSTOMER_HANDOVER_RECORDED', actorId: actor.id } })
    } else if (input.status === DeliveryCaseStatus.CANCELLED) {
      if (delivery.status !== DeliveryCaseStatus.PREPARING || actor.role === UserRole.FINANCE) return { type: 'invalid-transition' as const }
      const paymentCheck = await tx.deliveryChecklistEntry.findUnique({
        where: { deliveryCaseId_code: { deliveryCaseId, code: DeliveryChecklistCode.CLEARED_PAYMENT_VERIFIED } },
        select: { completedAt: true },
      })
      if (paymentCheck?.completedAt) return { type: 'invalid-transition' as const }
      const released = await tx.vehicle.updateMany({ where: { id: delivery.vehicleId, status: VehicleStatus.RESERVED },
        data: { status: VehicleStatus.AVAILABLE, version: { increment: 1 } } })
      if (!released.count) throw new DeliveryTransactionConflict()
      const changed = await tx.deliveryCase.updateMany({ where: { id: deliveryCaseId, status: DeliveryCaseStatus.PREPARING, version: input.version },
        data: { status: DeliveryCaseStatus.CANCELLED, version: { increment: 1 } } })
      if (!changed.count) throw new DeliveryTransactionConflict()
      await tx.vehicleStatusHistory.create({ data: { vehicleId: delivery.vehicleId, fromStatus: VehicleStatus.RESERVED,
        toStatus: VehicleStatus.AVAILABLE, reason: 'DELIVERY_PREPARATION_CANCELLED', actorId: actor.id } })
    } else return { type: 'invalid-transition' as const }
    await tx.auditLog.create({ data: { actorId: actor.id, action: 'DELIVERY_CASE_STATUS_CHANGED', entity: 'DeliveryCase', entityId: deliveryCaseId,
      resourceType: 'DeliveryCase', resourceId: deliveryCaseId, summary: 'Changed the delivery case status.',
      metadata: { fromStatus: delivery.status, toStatus: input.status, dealId: delivery.dealId,
        customerAcknowledged: input.status === DeliveryCaseStatus.HANDED_OVER ? input.customerAcknowledged === true : null } } })
    return { type: 'updated' as const }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }) }
  catch (error) { if (error instanceof DeliveryTransactionConflict) return { type: 'conflict' as const }; throw error }
}
