import 'server-only'

import { InquiryStatus, Prisma, VehicleStatus } from '@prisma/client'
import type { AdminActor } from '@/lib/auth/require-admin'
import { canAccessAssignedResource } from '@/lib/auth/admin-resource-policy'
import { prisma } from '@/lib/db/prisma'
import { estimateVehicleQuote, type IndicativeQuoteInput } from './quote-policy'

const eligibleInquiryStates: InquiryStatus[] = [
  InquiryStatus.NEW, InquiryStatus.ASSIGNED, InquiryStatus.CONTACTED,
  InquiryStatus.IN_PROGRESS, InquiryStatus.WAITING_FOR_CUSTOMER,
]

export async function getSalesQuoteDrafts(inquiryId: string, actor: AdminActor) {
  const inquiry = await prisma.inquiry.findUnique({
    where: { id: inquiryId }, select: {
      id: true, referenceNumber: true, status: true, assignedToId: true,
      vehicle: { select: { id: true, shortTitle: true, price: true, currency: true, status: true, published: true } },
    },
  })
  if (!inquiry || !canAccessAssignedResource(actor, inquiry)) return null
  const drafts = await prisma.salesQuoteDraft.findMany({
    where: { inquiryId }, take: 50, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: { id: true, vehiclePrice: true, discountAmount: true,
      estimatedOtherFees: true, estimatedSubtotal: true, currency: true,
      note: true, createdAt: true, createdBy: { select: { name: true } } },
  })
  return { inquiry, drafts, canCreate: eligibleInquiryStates.includes(inquiry.status) &&
    inquiry.vehicle?.status === VehicleStatus.AVAILABLE && inquiry.vehicle.published === true &&
    inquiry.vehicle.currency === 'INR' }
}

export async function createSalesQuoteDraft(inquiryId: string, actor: AdminActor, input: IndicativeQuoteInput) {
  return prisma.$transaction(async (tx) => {
    const inquiry = await tx.inquiry.findUnique({
      where: { id: inquiryId }, select: {
        id: true, status: true, assignedToId: true, vehicleId: true,
        vehicle: { select: { id: true, price: true, currency: true, status: true, published: true } },
      },
    })
    if (!inquiry || !canAccessAssignedResource(actor, inquiry)) return { type: 'not-found' as const }
    const vehicle = inquiry.vehicle
    if (!eligibleInquiryStates.includes(inquiry.status) || !vehicle ||
      vehicle.status !== VehicleStatus.AVAILABLE || !vehicle.published || vehicle.currency !== 'INR') {
      return { type: 'not-available' as const }
    }
    const calculation = estimateVehicleQuote(vehicle.price, input)
    if (!calculation) return { type: 'invalid-discount' as const }
    const draft = await tx.salesQuoteDraft.create({
      data: {
        inquiryId, vehicleId: vehicle.id, createdById: actor.id,
        ...calculation, note: input.note || null,
      },
      select: {
        id: true, vehiclePrice: true, discountAmount: true, estimatedOtherFees: true,
        estimatedSubtotal: true, currency: true, createdAt: true,
      },
    })
    await tx.auditLog.create({
      data: { actorId: actor.id, action: 'SALES_INDICATIVE_QUOTE_CREATED',
        entity: 'SalesQuoteDraft', entityId: draft.id,
        resourceType: 'Inquiry', resourceId: inquiryId,
        summary: 'Created an internal indicative vehicle price worksheet.',
        metadata: { vehicleId: vehicle.id, currency: 'INR' },
      },
    })
    return { type: 'created' as const, data: draft }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
}
