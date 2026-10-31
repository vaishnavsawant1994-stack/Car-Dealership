import 'server-only'

import { RequestStatus, TestDriveStatus } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import type { AdminActor } from '@/lib/auth/require-admin'
import { requireAccessibleLead } from '@/lib/admin/lead-service'

export async function scheduleTestDrive(id: string, actor: AdminActor, input: { confirmedDate: Date; confirmedTime: string; version: number; note?: string }, mode: 'confirm' | 'reschedule') {
  const record = await requireAccessibleLead('test-drives', id, actor)
  if (!record || !('vehicleId' in record) || !record.vehicleId || !('userId' in record)) return { type: 'not-found' as const }
  const allowed: TestDriveStatus[] = mode === 'confirm'
    ? [TestDriveStatus.REQUESTED, TestDriveStatus.RESCHEDULED]
    : [TestDriveStatus.REQUESTED, TestDriveStatus.CONFIRMED, TestDriveStatus.RESCHEDULE_REQUESTED]
  if (!allowed.includes(record.status as TestDriveStatus)) return { type: 'invalid-transition' as const }
  const dayStart = new Date(input.confirmedDate); dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1)
  const conflicting = await prisma.testDrive.findFirst({ where: { id: { not: id }, vehicleId: record.vehicleId, confirmedDate: { gte: dayStart, lt: dayEnd }, confirmedTime: input.confirmedTime, status: { in: [TestDriveStatus.CONFIRMED, TestDriveStatus.RESCHEDULED] } }, select: { id: true } })
  if (conflicting) return { type: 'slot-conflict' as const }
  const nextStatus = mode === 'confirm' ? TestDriveStatus.CONFIRMED : TestDriveStatus.RESCHEDULED
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.testDrive.updateMany({ where: { id, version: input.version }, data: { confirmedDate: input.confirmedDate, confirmedTime: input.confirmedTime, status: nextStatus, version: { increment: 1 } } })
    if (!updated.count) return null
    const body = `Your test drive is ${mode === 'confirm' ? 'confirmed' : 'rescheduled'} for ${input.confirmedDate.toLocaleDateString('en-IN')} at ${input.confirmedTime}.${input.note ? ` ${input.note}` : ''}`
    await tx.operationalActivity.create({ data: { resourceType: 'TestDrive', resourceId: id, actorId: actor.id, action: mode === 'confirm' ? 'CONFIRMED' : 'RESCHEDULED', summary: body } })
    await tx.operationalMessage.create({ data: { resourceType: 'TestDrive', resourceId: id, authorId: actor.id, type: 'CUSTOMER_MESSAGE', body, customerVisible: true } })
    if (record.userId) await tx.customerEngagementMessage.create({ data: { userId: record.userId, testDriveId: id, body, sentByCustomer: false, customerVisible: true } })
    return tx.testDrive.findUnique({ where: { id }, include: { vehicle: { select: { shortTitle: true } }, assignedTo: { select: { name: true } } } })
  })
  return result ? { type: 'success' as const, data: result } : { type: 'conflict' as const }
}

export async function saveSellInspection(id: string, actor: AdminActor, input: Record<string, unknown>) {
  const record = await requireAccessibleLead('sell-requests', id, actor)
  if (!record) return null
  const isComplete = Boolean(input.overallConditionScore && input.documentsVerified)
  return prisma.$transaction(async (tx) => {
    const inspection = await tx.sellInspection.upsert({ where: { sellRequestId: id }, create: { ...input, sellRequestId: id, inspectorId: actor.id, completedAt: isComplete ? new Date() : null }, update: { ...input, inspectorId: actor.id, completedAt: isComplete ? new Date() : null } })
    await tx.sellRequest.update({ where: { id }, data: { status: isComplete ? RequestStatus.INSPECTION_COMPLETED : RequestStatus.INSPECTION_SCHEDULED, version: { increment: 1 } } })
    await tx.operationalActivity.create({ data: { resourceType: 'SellRequest', resourceId: id, actorId: actor.id, action: isComplete ? 'INSPECTION_COMPLETED' : 'INSPECTION_SCHEDULED', summary: isComplete ? 'Vehicle inspection completed.' : 'Vehicle inspection details updated.' } })
    return inspection
  })
}

export async function createSellValuation(id: string, actor: AdminActor, input: { marketMinimum: number; marketMaximum: number; recommendedOffer: number; finalOffer?: number; validUntil: Date; notes?: string }) {
  const record = await requireAccessibleLead('sell-requests', id, actor)
  if (!record) return null
  return prisma.$transaction(async (tx) => {
    const valuation = await tx.sellValuation.create({ data: { ...input, sellRequestId: id, createdById: actor.id } })
    const status = input.finalOffer ? RequestStatus.OFFER_MADE : RequestStatus.VALUATION_READY
    await tx.sellRequest.update({ where: { id }, data: { status, version: { increment: 1 } } })
    await tx.operationalActivity.create({ data: { resourceType: 'SellRequest', resourceId: id, actorId: actor.id, action: input.finalOffer ? 'OFFER_CREATED' : 'VALUATION_CREATED', summary: input.finalOffer ? 'A customer offer was created.' : 'Internal valuation completed.', metadata: { valuationId: valuation.id } } })
    if (input.finalOffer) await tx.operationalMessage.create({ data: { resourceType: 'SellRequest', resourceId: id, authorId: actor.id, type: 'CUSTOMER_MESSAGE', customerVisible: true, body: `Car Dealership Demo has prepared an offer of INR ${input.finalOffer.toLocaleString('en-IN')}, valid until ${input.validUntil.toLocaleDateString('en-IN')}.` } })
    return valuation
  })
}
