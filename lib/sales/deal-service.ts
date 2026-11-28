import 'server-only'

import { randomUUID } from 'node:crypto'
import { InquiryStatus, Prisma, SalesDealStatus, VehicleStatus } from '@prisma/client'
import type { AdminActor } from '@/lib/auth/require-admin'
import { accessibleResourceWhere } from '@/lib/auth/admin-resource-policy'
import { getActorShowroomScope } from '@/lib/auth/showroom-scope'
import { prisma } from '@/lib/db/prisma'
import { assessSalesDealTransition, type TransitionSalesDealInput } from './deal-policy'

const openInquiryStates: InquiryStatus[] = [
  InquiryStatus.NEW, InquiryStatus.ASSIGNED, InquiryStatus.CONTACTED,
  InquiryStatus.IN_PROGRESS, InquiryStatus.WAITING_FOR_CUSTOMER,
]
const activeDealStates = [SalesDealStatus.OPEN, SalesDealStatus.NEGOTIATION, SalesDealStatus.WON]

function accessibleSalesResourceWhere(
  actor: AdminActor,
  scope: Awaited<ReturnType<typeof getActorShowroomScope>>,
) {
  return {
    ...accessibleResourceWhere(actor, scope),
    ...(!scope.global ? { vehicle: { is: { showroomId: { in: [...scope.showroomIds] } } } } : {}),
  }
}

function accessibleSalesDealWhere(
  actor: AdminActor,
  scope: Awaited<ReturnType<typeof getActorShowroomScope>>,
) {
  return {
    ...accessibleSalesResourceWhere(actor, scope),
    ...(!scope.global ? { inquiry: { is: { showroomId: { in: [...scope.showroomIds] } } } } : {}),
  }
}

const dealSummarySelect = {
  id: true,
  referenceNumber: true,
  inquiryId: true,
  status: true,
  version: true,
  acceptanceMethod: true,
  lossReason: true,
  closedAt: true,
  createdAt: true,
  updatedAt: true,
  inquiry: { select: { referenceNumber: true, fullName: true, assignedToId: true } },
  vehicle: { select: { id: true, shortTitle: true, stockNumber: true } },
  quoteDraft: { select: { vehiclePrice: true, discountAmount: true, estimatedOtherFees: true, estimatedSubtotal: true, currency: true } },
  assignedTo: { select: { id: true, name: true } },
  events: { take: 20, orderBy: [{ createdAt: 'desc' as const }, { id: 'desc' as const }],
    select: { id: true, fromStatus: true, toStatus: true, acceptanceMethod: true, lossReason: true,
      createdAt: true, actor: { select: { name: true } } } },
}

function dealReference() {
  return `DEAL-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 8).toUpperCase()}`
}

export async function listSalesDeals(actor: AdminActor, status?: SalesDealStatus) {
  const scope = await getActorShowroomScope(actor)
  return prisma.salesDeal.findMany({
    where: { ...accessibleSalesDealWhere(actor, scope), ...(status ? { status } : {}) },
    select: dealSummarySelect,
    take: 100,
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
  })
}

export async function getActiveSalesDealForInquiry(inquiryId: string, actor: AdminActor) {
  const scope = await getActorShowroomScope(actor)
  return prisma.salesDeal.findFirst({
    where: { inquiryId, status: { in: activeDealStates }, ...accessibleSalesDealWhere(actor, scope) },
    select: { id: true, referenceNumber: true, status: true },
  })
}

export async function createSalesDeal(inquiryId: string, actor: AdminActor, quoteDraftId: string) {
  const scope = await getActorShowroomScope(actor)
  return prisma.$transaction(async (tx) => {
    const inquiry = await tx.inquiry.findFirst({
      where: { id: inquiryId, ...accessibleSalesResourceWhere(actor, scope) },
      select: { id: true, status: true, showroomId: true, assignedToId: true, vehicleId: true,
        vehicle: { select: { id: true, price: true, currency: true, status: true, published: true } } },
    })
    if (!inquiry) return { type: 'not-found' as const }
    if (!openInquiryStates.includes(inquiry.status) || !inquiry.vehicleId || !inquiry.vehicle ||
      inquiry.vehicle.status !== VehicleStatus.AVAILABLE || !inquiry.vehicle.published || inquiry.vehicle.currency !== 'INR') {
      return { type: 'not-available' as const }
    }
    const quote = await tx.salesQuoteDraft.findFirst({
      where: { id: quoteDraftId, inquiryId, vehicleId: inquiry.vehicleId },
      select: { id: true, vehiclePrice: true },
    })
    if (!quote) return { type: 'quote-not-found' as const }
    if (quote.vehiclePrice !== inquiry.vehicle.price) return { type: 'quote-stale' as const }

    const existing = await tx.salesDeal.findFirst({
      where: { inquiryId, status: { in: activeDealStates } }, select: { id: true },
    })
    if (existing) return { type: 'already-active' as const }

    const deal = await tx.salesDeal.create({
      data: {
        referenceNumber: dealReference(), inquiryId, quoteDraftId, vehicleId: inquiry.vehicleId,
        showroomId: inquiry.showroomId, assignedToId: inquiry.assignedToId, createdById: actor.id,
        events: { create: { actorId: actor.id, fromStatus: null, toStatus: SalesDealStatus.OPEN } },
      },
      select: { id: true, referenceNumber: true, status: true, version: true },
    })
    await tx.auditLog.create({ data: {
      actorId: actor.id, action: 'SALES_DEAL_OPENED', entity: 'SalesDeal', entityId: deal.id,
      resourceType: 'Inquiry', resourceId: inquiry.id,
      summary: 'Opened an internal sales deal from an indicative quote.',
      metadata: { status: deal.status, quoteDraftId, vehicleId: inquiry.vehicleId },
    } })
    return { type: 'created' as const, data: deal }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
}

export async function transitionSalesDeal(id: string, actor: AdminActor, input: TransitionSalesDealInput) {
  const scope = await getActorShowroomScope(actor)
  return prisma.$transaction(async (tx) => {
    const where = { id, ...accessibleSalesDealWhere(actor, scope) }
    const current = await tx.salesDeal.findFirst({ where, select: { id: true, status: true, version: true } })
    if (!current) return { type: 'not-found' as const }
    if (current.version !== input.version) return { type: 'conflict' as const }
    const assessment = assessSalesDealTransition(current.status, input)
    if (!assessment.allowed) return { type: 'invalid-transition' as const, code: assessment.code }

    const closed = input.status !== SalesDealStatus.OPEN && input.status !== SalesDealStatus.NEGOTIATION
    const changed = await tx.salesDeal.updateMany({
      where: { ...where, version: input.version },
      data: {
        status: input.status,
        version: { increment: 1 },
        acceptanceMethod: input.status === SalesDealStatus.WON ? input.acceptanceMethod : null,
        lossReason: input.status === SalesDealStatus.LOST ? input.lossReason : null,
        closedAt: closed ? new Date() : null,
      },
    })
    if (!changed.count) return { type: 'conflict' as const }
    const saved = await tx.salesDeal.findUniqueOrThrow({
      where: { id }, select: { id: true, referenceNumber: true, status: true, version: true,
        acceptanceMethod: true, lossReason: true, closedAt: true },
    })
    await tx.salesDealEvent.create({
      data: { dealId: id, actorId: actor.id, fromStatus: current.status, toStatus: input.status,
        acceptanceMethod: input.acceptanceMethod ?? null, lossReason: input.lossReason ?? null },
    })
    await tx.auditLog.create({ data: {
      actorId: actor.id, action: 'SALES_DEAL_STATUS_CHANGED', entity: 'SalesDeal', entityId: id,
      resourceType: 'SalesDeal', resourceId: id,
      summary: 'Changed an internal sales deal status.',
      metadata: { fromStatus: current.status, toStatus: input.status,
        acceptanceMethod: input.acceptanceMethod ?? null, lossReason: input.lossReason ?? null },
    } })
    return { type: 'updated' as const, data: saved }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
}

export async function getSalesDeal(id: string, actor: AdminActor) {
  const scope = await getActorShowroomScope(actor)
  return prisma.salesDeal.findFirst({
    where: { id, ...accessibleSalesDealWhere(actor, scope) },
    select: { ...dealSummarySelect, events: { take: 100, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: { id: true, fromStatus: true, toStatus: true, acceptanceMethod: true, lossReason: true,
        createdAt: true, actor: { select: { name: true } } } } },
  })
}
