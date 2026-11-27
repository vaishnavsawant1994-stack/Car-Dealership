import 'server-only'

import { Prisma, WorkshopOrderStatus, WorkshopPartRequestStatus } from '@prisma/client'
import type { AdminActor } from '@/lib/auth/require-admin'
import { accessibleResourceWhere, showroomScopeWhere } from '@/lib/auth/admin-resource-policy'
import { getActorShowroomScope } from '@/lib/auth/showroom-scope'
import { prisma } from '@/lib/db/prisma'

function validQuantity(value: string) {
  return /^\d{1,10}(?:\.\d{1,2})?$/.test(value) && Number(value) > 0
}

function showroomRecordWhere(scope: Awaited<ReturnType<typeof getActorShowroomScope>>) {
  return scope.global ? {} : { id: { in: scope.showroomIds } }
}

function scopedWorkshopOrderWhere(actor: AdminActor, scope: Awaited<ReturnType<typeof getActorShowroomScope>>) {
  const base = actor.role === 'PARTS_MANAGER' ? showroomScopeWhere(scope) : accessibleResourceWhere(actor, scope)
  return {
    ...base,
    ...(!scope.global ? { vehicle: { is: { showroomId: { in: [...scope.showroomIds] } } } } : {}),
  }
}

export async function listParts(actor: AdminActor) {
  const scope = await getActorShowroomScope(actor)
  const [parts, movements] = await Promise.all([
    prisma.inventoryPart.findMany({ where: { active: true }, orderBy: [{ name: 'asc' }, { sku: 'asc' }], take: 500,
      select: { id: true, sku: true, name: true, unit: true } }),
    prisma.partInventoryMovement.groupBy({ by: ['partId', 'showroomId'], where: showroomScopeWhere(scope), _sum: { quantityDelta: true } }),
  ])
  const stocks = movements.map((movement) => ({ partId: movement.partId, showroomId: movement.showroomId,
    quantity: (movement._sum.quantityDelta ?? new Prisma.Decimal(0)).toString() }))
  const showroomWhere = scope.global ? {} : { id: { in: scope.showroomIds } }
  const showrooms = await prisma.showroom.findMany({ where: { ...showroomWhere, active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } })
  return { parts, stocks, showrooms }
}

export async function createPartAndReceive(input: { sku: string; name: string; unit: string; showroomId: string; quantity: string; reason: string }, actor: AdminActor) {
  if (!validQuantity(input.quantity)) return { type: 'invalid-quantity' as const }
  const scope = await getActorShowroomScope(actor)
  if (!scope.global && !scope.showroomIds.includes(input.showroomId)) return { type: 'not-available' as const }
  try {
    return await prisma.$transaction(async (tx) => {
      const showroom = await tx.showroom.findFirst({ where: { id: input.showroomId, active: true, ...showroomRecordWhere(scope) }, select: { id: true } })
      if (!showroom) return { type: 'not-available' as const }
      const part = await tx.inventoryPart.create({ data: { sku: input.sku, name: input.name, unit: input.unit } })
      const movement = await tx.partInventoryMovement.create({ data: { partId: part.id, showroomId: input.showroomId,
        quantityDelta: new Prisma.Decimal(input.quantity), reason: input.reason, createdById: actor.id } })
      await tx.auditLog.create({ data: { actorId: actor.id, action: 'PART_CREATED_AND_RECEIVED', entity: 'InventoryPart', entityId: part.id,
        resourceType: 'PartInventoryMovement', resourceId: movement.id, summary: 'Created a parts catalog item and recorded initial branch stock.',
        metadata: { sku: part.sku, showroomId: input.showroomId, quantity: input.quantity } } })
      return { type: 'created' as const, data: part }
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return { type: 'duplicate-sku' as const }
    throw error
  }
}

export async function receivePartStock(input: { partId: string; showroomId: string; quantity: string; reason: string; reference?: string }, actor: AdminActor) {
  if (!validQuantity(input.quantity)) return { type: 'invalid-quantity' as const }
  const scope = await getActorShowroomScope(actor)
  if (!scope.global && !scope.showroomIds.includes(input.showroomId)) return { type: 'not-available' as const }
  return prisma.$transaction(async (tx) => {
    const showroom = await tx.showroom.findFirst({ where: { id: input.showroomId, active: true, ...showroomRecordWhere(scope) }, select: { id: true } })
    if (!showroom) return { type: 'not-available' as const }
    const part = await tx.inventoryPart.findFirst({ where: { id: input.partId, active: true }, select: { id: true, sku: true } })
    if (!part) return { type: 'not-available' as const }
    const movement = await tx.partInventoryMovement.create({ data: { partId: part.id, showroomId: input.showroomId,
      quantityDelta: new Prisma.Decimal(input.quantity), reason: input.reason, reference: input.reference, createdById: actor.id } })
    await tx.auditLog.create({ data: { actorId: actor.id, action: 'PART_STOCK_RECEIVED', entity: 'PartInventoryMovement', entityId: movement.id,
      resourceType: 'InventoryPart', resourceId: part.id, summary: 'Recorded a parts stock receipt.',
      metadata: { sku: part.sku, showroomId: input.showroomId, quantity: input.quantity } } })
    return { type: 'received' as const }
  })
}

export async function createWorkshopPartRequest(input: { workshopOrderId: string; partId: string; quantity: string }, actor: AdminActor) {
  if (!validQuantity(input.quantity)) return { type: 'invalid-quantity' as const }
  const scope = await getActorShowroomScope(actor)
  const order = await prisma.workshopOrder.findFirst({ where: { id: input.workshopOrderId,
    status: { in: [WorkshopOrderStatus.OPEN, WorkshopOrderStatus.SCHEDULED, WorkshopOrderStatus.IN_PROGRESS] },
    ...scopedWorkshopOrderWhere(actor, scope) }, select: { id: true, showroomId: true } })
  if (!order?.showroomId) return { type: 'not-available' as const }
  const part = await prisma.inventoryPart.findFirst({ where: { id: input.partId, active: true }, select: { id: true } })
  if (!part) return { type: 'not-available' as const }
  const request = await prisma.workshopPartRequest.create({ data: { workshopOrderId: order.id, partId: part.id,
    requestedById: actor.id, quantity: new Prisma.Decimal(input.quantity) }, select: { id: true } })
  await prisma.auditLog.create({ data: { actorId: actor.id, action: 'WORKSHOP_PART_REQUESTED', entity: 'WorkshopPartRequest', entityId: request.id,
    resourceType: 'WorkshopOrder', resourceId: order.id, summary: 'Requested inventory parts for a workshop job card.' } })
  return { type: 'requested' as const, data: request }
}

export async function listWorkshopPartRequests(actor: AdminActor) {
  const scope = await getActorShowroomScope(actor)
  const where = { workshopOrder: scopedWorkshopOrderWhere(actor, scope) }
  const requests = await prisma.workshopPartRequest.findMany({ where: { ...where, status: WorkshopPartRequestStatus.REQUESTED },
    select: { id: true, quantity: true, status: true, version: true, createdAt: true,
      part: { select: { sku: true, name: true, unit: true } },
      workshopOrder: { select: { id: true, referenceNumber: true, showroom: { select: { id: true, name: true } }, vehicle: { select: { shortTitle: true, stockNumber: true } } } },
      requestedBy: { select: { name: true } } }, take: 100, orderBy: { createdAt: 'asc' } })
  return requests.map((request) => ({ ...request, quantity: request.quantity.toString() }))
}

export async function issueWorkshopPartRequest(input: { id: string; version: number }, actor: AdminActor) {
  const scope = await getActorShowroomScope(actor)
  return prisma.$transaction(async (tx) => {
    const request = await tx.workshopPartRequest.findFirst({ where: { id: input.id, status: WorkshopPartRequestStatus.REQUESTED,
      version: input.version, workshopOrder: { status: { in: [WorkshopOrderStatus.OPEN, WorkshopOrderStatus.SCHEDULED, WorkshopOrderStatus.IN_PROGRESS] }, ...scopedWorkshopOrderWhere(actor, scope) } },
      select: { id: true, version: true, partId: true, quantity: true, workshopOrderId: true,
        workshopOrder: { select: { showroomId: true, status: true } } } })
    if (!request?.workshopOrder.showroomId) return { type: 'not-available' as const }
    const balance = await tx.partInventoryMovement.aggregate({ where: { partId: request.partId, showroomId: request.workshopOrder.showroomId }, _sum: { quantityDelta: true } })
    const available = balance._sum.quantityDelta ?? new Prisma.Decimal(0)
    if (available.lessThan(request.quantity)) return { type: 'insufficient-stock' as const }
    const updated = await tx.workshopPartRequest.updateMany({ where: { id: input.id, version: input.version, status: WorkshopPartRequestStatus.REQUESTED },
      data: { status: WorkshopPartRequestStatus.ISSUED, version: { increment: 1 }, issuedAt: new Date(), issuedById: actor.id } })
    if (!updated.count) return { type: 'conflict' as const }
    const movement = await tx.partInventoryMovement.create({ data: { partId: request.partId, showroomId: request.workshopOrder.showroomId,
      workshopOrderId: request.workshopOrderId, quantityDelta: request.quantity.negated(), reason: 'WORKSHOP_ISSUE', reference: request.id, createdById: actor.id } })
    await tx.auditLog.create({ data: { actorId: actor.id, action: 'WORKSHOP_PART_ISSUED', entity: 'WorkshopPartRequest', entityId: request.id,
      resourceType: 'PartInventoryMovement', resourceId: movement.id, summary: 'Issued branch parts stock to a workshop job card.' } })
    return { type: 'issued' as const }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
}
