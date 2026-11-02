import 'server-only'

import { ContactInquiryStatus, InquiryStatus, OperationalMessageType, RequestStatus, TestDriveStatus, type LeadPriority } from '@prisma/client'
import { contactTransitions, inquiryTransitions, sellRequestTransitions, testDriveTransitions, canTransition } from '@/lib/admin/lead-workflows'
import { accessibleResourceWhere, canAccessScopedResource, canAssignResource, type ShowroomScope } from '@/lib/auth/admin-resource-policy'
import type { AdminActor } from '@/lib/auth/require-admin'
import { prisma } from '@/lib/db/prisma'
import { getActorShowroomScope } from '@/lib/auth/showroom-scope'

export type LeadKind = 'enquiries' | 'test-drives' | 'sell-requests' | 'contact-inquiries'
export const leadResource: Record<LeadKind, string> = { enquiries: 'Inquiry', 'test-drives': 'TestDrive', 'sell-requests': 'SellRequest', 'contact-inquiries': 'ContactMessage' }

const safeCustomer = { id: true, name: true, email: true, phone: true, role: true, status: true } as const
const safeAssignee = { id: true, name: true, email: true, role: true, status: true } as const
const safeVehicle = {
  id: true,
  slug: true,
  stockNumber: true,
  shortTitle: true,
  status: true,
  images: { where: { isPrimary: true }, take: 1, select: { id: true, url: true, altText: true } },
} as const

export async function findLead(kind: LeadKind, id: string, actor: AdminActor, scope: ShowroomScope) {
  const where = { id, ...accessibleResourceWhere(actor, scope) }
  if (kind === 'enquiries') return prisma.inquiry.findFirst({ where, include: { vehicle: { select: safeVehicle }, user: { select: safeCustomer }, assignedTo: { select: safeAssignee } } })
  if (kind === 'test-drives') return prisma.testDrive.findFirst({ where, include: { vehicle: { select: safeVehicle }, user: { select: safeCustomer }, assignedTo: { select: safeAssignee } } })
  if (kind === 'sell-requests') return prisma.sellRequest.findFirst({ where, include: { user: { select: safeCustomer }, assignedTo: { select: safeAssignee }, inspection: true, valuations: { orderBy: { createdAt: 'desc' } } } })
  return prisma.contactMessage.findFirst({ where, include: { assignedTo: { select: safeAssignee } } })
}

export async function requireAccessibleLead(kind: LeadKind, id: string, actor: AdminActor) {
  const scope = await getActorShowroomScope(actor)
  const lead = await findLead(kind, id, actor, scope)
  if (!lead || !canAccessScopedResource(actor, lead, scope)) return null
  return lead
}

export async function assignLead(kind: LeadKind, id: string, actor: AdminActor, assigneeId: string | null, version: number) {
  if (!canAssignResource(actor, assigneeId)) throw new Error('ASSIGNMENT_FORBIDDEN')
  const scope = await getActorShowroomScope(actor)
  const current = await findLead(kind, id, actor, scope)
  if (!current || !canAccessScopedResource(actor, current, scope)) return null
  if (assigneeId) {
    const membership = await prisma.showroomStaffAssignment.findFirst({
      where: { userId: assigneeId, showroomId: current.showroomId ?? '', showroom: { active: true }, user: { status: 'ACTIVE', deletedAt: null, role: { in: ['SALES', 'OPERATIONS', 'CONTENT_MANAGER', 'ADMIN'] } } },
      select: { id: true },
    })
    if (!membership) throw new Error('ASSIGNEE_OUTSIDE_SHOWROOM')
  }
  const model = kind === 'enquiries' ? prisma.inquiry : kind === 'test-drives' ? prisma.testDrive : kind === 'sell-requests' ? prisma.sellRequest : prisma.contactMessage
  const result = await (model.updateMany as Function)({ where: { id, version, ...accessibleResourceWhere(actor, scope) }, data: { assignedToId: assigneeId, version: { increment: 1 }, ...(kind === 'enquiries' ? { status: InquiryStatus.ASSIGNED } : kind === 'contact-inquiries' ? { status: ContactInquiryStatus.ASSIGNED } : {}) } }) as { count: number }
  if (!result.count) return null
  await prisma.operationalActivity.create({ data: { resourceType: leadResource[kind], resourceId: id, actorId: actor.id, action: 'ASSIGNED', summary: assigneeId ? 'Record assigned to staff.' : 'Record returned to unassigned queue.', metadata: { assigneeId } } })
  return findLead(kind, id, actor, scope)
}

function validStatus(kind: LeadKind, current: string, next: string): boolean {
  if (kind === 'enquiries') return Object.values(InquiryStatus).includes(next as InquiryStatus) && canTransition(inquiryTransitions, current as InquiryStatus, next as InquiryStatus)
  if (kind === 'test-drives') return Object.values(TestDriveStatus).includes(next as TestDriveStatus) && canTransition(testDriveTransitions, current as TestDriveStatus, next as TestDriveStatus)
  if (kind === 'sell-requests') return Object.values(RequestStatus).includes(next as RequestStatus) && canTransition(sellRequestTransitions, current as RequestStatus, next as RequestStatus)
  return Object.values(ContactInquiryStatus).includes(next as ContactInquiryStatus) && canTransition(contactTransitions, current as ContactInquiryStatus, next as ContactInquiryStatus)
}

export async function updateLead(kind: LeadKind, id: string, actor: AdminActor, input: { status: string; priority?: LeadPriority; followUpAt?: Date | null; version: number }) {
  const current = await requireAccessibleLead(kind, id, actor)
  if (!current) return { type: 'not-found' as const }
  if (!validStatus(kind, current.status, input.status)) return { type: 'invalid-transition' as const }
  const data = { status: input.status, priority: input.priority, followUpAt: input.followUpAt, version: { increment: 1 } }
  const scope = await getActorShowroomScope(actor)
  const model = kind === 'enquiries' ? prisma.inquiry : kind === 'test-drives' ? prisma.testDrive : kind === 'sell-requests' ? prisma.sellRequest : prisma.contactMessage
  const result = await (model.updateMany as Function)({ where: { id, version: input.version, ...accessibleResourceWhere(actor, scope) }, data }) as { count: number }
  if (!result.count) return { type: 'conflict' as const }
  await prisma.operationalActivity.create({ data: { resourceType: leadResource[kind], resourceId: id, actorId: actor.id, action: 'STATUS_CHANGED', summary: `${current.status} changed to ${input.status}.`, metadata: { from: current.status, to: input.status } } })
  return { type: 'success' as const, data: await findLead(kind, id, actor, scope) }
}

export async function addLeadMessage(kind: LeadKind, id: string, actor: AdminActor, input: { body: string; customerVisible: boolean; type: Exclude<OperationalMessageType, 'SYSTEM'> }) {
  const lead = await requireAccessibleLead(kind, id, actor)
  if (!lead) return null
  await prisma.$transaction(async (tx) => {
    await tx.operationalMessage.create({ data: { resourceType: leadResource[kind], resourceId: id, authorId: actor.id, type: input.type, body: input.body, customerVisible: input.customerVisible } })
    if (input.customerVisible && 'userId' in lead && lead.userId && (kind === 'enquiries' || kind === 'test-drives')) {
      await tx.customerEngagementMessage.create({ data: { userId: lead.userId, inquiryId: kind === 'enquiries' ? id : undefined, testDriveId: kind === 'test-drives' ? id : undefined, body: input.body, sentByCustomer: false, customerVisible: true } })
    }
    await tx.operationalActivity.create({ data: { resourceType: leadResource[kind], resourceId: id, actorId: actor.id, action: input.customerVisible ? 'CUSTOMER_MESSAGE_ADDED' : 'INTERNAL_NOTE_ADDED', summary: input.customerVisible ? 'Customer-visible update added.' : 'Internal note added.' } })
  })
  return true
}

export function listStaff() {
  return prisma.user.findMany({ where: { role: { not: 'CUSTOMER' }, status: 'ACTIVE', deletedAt: null }, orderBy: { name: 'asc' }, select: { id: true, name: true, email: true, role: true } })
}
