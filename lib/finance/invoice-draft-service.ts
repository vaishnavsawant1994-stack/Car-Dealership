import 'server-only'

import { randomUUID } from 'node:crypto'
import { Prisma, SalesDealStatus } from '@prisma/client'
import type { AdminActor } from '@/lib/auth/require-admin'
import { accessibleResourceWhere } from '@/lib/auth/admin-resource-policy'
import { getActorShowroomScope } from '@/lib/auth/showroom-scope'
import { prisma } from '@/lib/db/prisma'

function invoiceDraftReference() {
  return `DRAFT-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 8).toUpperCase()}`
}

export async function listSalesInvoiceDrafts(actor: AdminActor) {
  const scope = await getActorShowroomScope(actor)
  return prisma.salesInvoiceDraft.findMany({
    where: { deal: accessibleResourceWhere(actor, scope) },
    select: {
      id: true, referenceNumber: true, status: true, version: true, vehicleTitle: true,
      stockNumber: true, vehiclePrice: true, discountAmount: true, estimatedOtherFees: true,
      estimatedSubtotal: true, currency: true, createdAt: true, updatedAt: true,
      deal: { select: { id: true, referenceNumber: true, inquiry: { select: { referenceNumber: true } } } },
    },
    take: 100,
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
  })
}

export async function listWonSalesDealsForFinance(actor: AdminActor) {
  const scope = await getActorShowroomScope(actor)
  return prisma.salesDeal.findMany({
    where: { status: SalesDealStatus.WON, ...accessibleResourceWhere(actor, scope), invoiceDraft: null },
    select: { id: true, referenceNumber: true, updatedAt: true,
      vehicle: { select: { shortTitle: true, stockNumber: true } },
      quoteDraft: { select: { estimatedSubtotal: true, currency: true } } },
    take: 100,
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
  })
}

export async function createSalesInvoiceDraft(dealId: string, actor: AdminActor) {
  const scope = await getActorShowroomScope(actor)
  try {
    return await prisma.$transaction(async (tx) => {
      const deal = await tx.salesDeal.findFirst({
        where: { id: dealId, status: SalesDealStatus.WON, ...accessibleResourceWhere(actor, scope) },
        select: {
          id: true, referenceNumber: true, status: true,
          quoteDraft: { select: { vehiclePrice: true, discountAmount: true, estimatedOtherFees: true, estimatedSubtotal: true, currency: true } },
          vehicle: { select: { shortTitle: true, stockNumber: true } },
        },
      })
      if (!deal) return { type: 'not-available' as const }

      const { vehiclePrice, discountAmount, estimatedOtherFees, estimatedSubtotal, currency } = deal.quoteDraft
      if (currency !== 'INR' || [vehiclePrice, discountAmount, estimatedOtherFees, estimatedSubtotal].some((amount) => !Number.isSafeInteger(amount) || amount < 0) ||
        discountAmount > vehiclePrice || vehiclePrice - discountAmount + estimatedOtherFees !== estimatedSubtotal) {
        return { type: 'invalid-amounts' as const }
      }
      const existing = await tx.salesInvoiceDraft.findUnique({ where: { dealId }, select: { id: true, referenceNumber: true } })
      if (existing) return { type: 'already-created' as const, data: existing }

      const draft = await tx.salesInvoiceDraft.create({
        data: {
          referenceNumber: invoiceDraftReference(), dealId, createdById: actor.id,
          vehicleTitle: deal.vehicle.shortTitle, stockNumber: deal.vehicle.stockNumber,
          vehiclePrice, discountAmount, estimatedOtherFees, estimatedSubtotal, currency,
        },
        select: { id: true, referenceNumber: true, status: true, version: true, dealId: true,
          vehicleTitle: true, stockNumber: true, vehiclePrice: true, discountAmount: true,
          estimatedOtherFees: true, estimatedSubtotal: true, currency: true, createdAt: true },
      })
      await tx.auditLog.create({ data: {
        actorId: actor.id, action: 'SALES_INVOICE_DRAFT_CREATED', entity: 'SalesInvoiceDraft', entityId: draft.id,
        resourceType: 'SalesDeal', resourceId: deal.id,
        summary: 'Created an internal finance worksheet from a won sales deal.',
        metadata: { status: draft.status, currency: draft.currency, estimatedSubtotal: draft.estimatedSubtotal },
      } })
      return { type: 'created' as const, data: draft }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const existing = await prisma.salesInvoiceDraft.findUnique({ where: { dealId }, select: { id: true, referenceNumber: true } })
      if (existing) return { type: 'already-created' as const, data: existing }
      throw error
    }
    throw error
  }
}
