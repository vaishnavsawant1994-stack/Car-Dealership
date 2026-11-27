import 'server-only'

import { randomUUID } from 'node:crypto'
import { Prisma, SalesDealStatus } from '@prisma/client'
import type { AdminActor } from '@/lib/auth/require-admin'
import { showroomScopeWhere } from '@/lib/auth/admin-resource-policy'
import { getActorShowroomScope } from '@/lib/auth/showroom-scope'
import { prisma } from '@/lib/db/prisma'
import { createSandboxPaymentProvider, paymentMode, type SandboxOutcome } from '@/lib/payments/sandbox'

function invoiceDraftReference() {
  return `DRAFT-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 8).toUpperCase()}`
}

export async function listSalesInvoiceDrafts(actor: AdminActor) {
  const scope = await getActorShowroomScope(actor)
  return prisma.salesInvoiceDraft.findMany({
    where: { deal: showroomScopeWhere(scope) },
    select: {
      id: true, referenceNumber: true, status: true, version: true, vehicleTitle: true,
      stockNumber: true, vehiclePrice: true, discountAmount: true, estimatedOtherFees: true,
      estimatedSubtotal: true, currency: true, createdAt: true, updatedAt: true,
      paymentSimulations: { select: { simulatorReference: true, amount: true, currency: true, outcome: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 10 },
      deal: { select: { id: true, referenceNumber: true, inquiry: { select: { referenceNumber: true } } } },
    },
    take: 100,
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
  })
}

export async function listWonSalesDealsForFinance(actor: AdminActor) {
  const scope = await getActorShowroomScope(actor)
  return prisma.salesDeal.findMany({
    where: { status: SalesDealStatus.WON, ...showroomScopeWhere(scope), invoiceDraft: null },
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
        where: { id: dealId, status: SalesDealStatus.WON, ...showroomScopeWhere(scope) },
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

export async function runPaymentSandboxSimulation(
  invoiceDraftId: string,
  actor: AdminActor,
  input: { idempotencyKey: string; outcome: SandboxOutcome },
) {
  if (paymentMode() !== 'sandbox') return { type: 'disabled' as const }
  const scope = await getActorShowroomScope(actor)
  try {
    return await prisma.$transaction(async (tx) => {
      const draft = await tx.salesInvoiceDraft.findFirst({
        where: { id: invoiceDraftId, status: 'DRAFT', deal: showroomScopeWhere(scope) },
        select: { id: true, estimatedSubtotal: true, currency: true },
      })
      if (!draft || draft.currency !== 'INR' || draft.estimatedSubtotal <= 0) return { type: 'not-available' as const }

      const prior = await tx.paymentSandboxAttempt.findUnique({ where: { idempotencyKey: input.idempotencyKey } })
      if (prior) {
        if (prior.invoiceDraftId !== draft.id || prior.outcome !== input.outcome) return { type: 'idempotency-conflict' as const }
        return { type: 'already-simulated' as const, data: prior }
      }

      const simulated = createSandboxPaymentProvider().simulate({
        amount: draft.estimatedSubtotal, currency: 'INR', idempotencyKey: input.idempotencyKey, outcome: input.outcome,
      })
      const attempt = await tx.paymentSandboxAttempt.create({ data: {
        invoiceDraftId: draft.id, createdById: actor.id, idempotencyKey: input.idempotencyKey,
        simulatorReference: simulated.simulatorReference, amount: draft.estimatedSubtotal,
        currency: 'INR', outcome: simulated.outcome,
      } })
      await tx.auditLog.create({ data: {
        actorId: actor.id, action: 'PAYMENT_SANDBOX_SIMULATED', entity: 'PaymentSandboxAttempt', entityId: attempt.id,
        resourceType: 'SalesInvoiceDraft', resourceId: draft.id,
        summary: 'Recorded a local payment sandbox simulation. No funds moved.',
        metadata: { outcome: attempt.outcome, amount: attempt.amount, currency: attempt.currency, simulatorReference: attempt.simulatorReference },
      } })
      return { type: 'simulated' as const, data: attempt }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const prior = await prisma.paymentSandboxAttempt.findUnique({ where: { idempotencyKey: input.idempotencyKey } })
      if (prior?.invoiceDraftId === invoiceDraftId && prior.outcome === input.outcome) {
        return { type: 'already-simulated' as const, data: prior }
      }
      if (prior) return { type: 'idempotency-conflict' as const }
    }
    throw error
  }
}
