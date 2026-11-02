import {
  ContactInquiryStatus,
  InquiryStatus,
  LeadPriority,
  RequestStatus,
  TestDriveStatus,
  UserRole,
  type Prisma,
} from '@prisma/client'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { adminError, conflictError, validationError } from '@/lib/admin/api'
import { writeAuditLog } from '@/lib/admin/audit'
import { addLeadMessage, assignLead, leadResource, requireAccessibleLead, updateLead, type LeadKind } from '@/lib/admin/lead-service'
import type { AdminPermission } from '@/lib/auth/admin-permissions'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { prisma } from '@/lib/db/prisma'
import { getActorShowroomScope } from '@/lib/auth/showroom-scope'
import { showroomScopeWhere } from '@/lib/auth/admin-resource-policy'
import { andFilters } from './scoped-query'
import { assignmentSchema, leadUpdateSchema, operationalMessageSchema } from '@/lib/validation/admin'

const permissions: Record<LeadKind, { view: AdminPermission; update: AdminPermission; assign: AdminPermission }> = {
  enquiries: { view: 'enquiry.view', update: 'enquiry.update', assign: 'enquiry.assign' },
  'test-drives': { view: 'testDrive.view', update: 'testDrive.confirm', assign: 'testDrive.assign' },
  'sell-requests': { view: 'sellRequest.view', update: 'sellRequest.inspect', assign: 'sellRequest.assign' },
  'contact-inquiries': { view: 'contactInquiry.view', update: 'contactInquiry.update', assign: 'contactInquiry.assign' },
}

const listQuery = z.object({
  page: z.coerce.number().int().positive().catch(1),
  pageSize: z.coerce.number().int().min(10).max(100).catch(20),
  search: z.string().trim().max(120).optional(),
  status: z.string().trim().max(60).optional(),
  priority: z.enum(LeadPriority).optional(),
  assigned: z.enum(['mine', 'unassigned', 'all']).catch('all'),
})

type AssignmentFilter = { assignedToId?: string | null; OR?: Array<{ assignedToId: string | null }> }

function assignmentWhere(actor: { id: string; role: UserRole }, assigned: string): AssignmentFilter {
  if (actor.role === UserRole.ADMIN || actor.role === UserRole.SUPER_ADMIN) {
    if (assigned === 'mine') return { assignedToId: actor.id }
    if (assigned === 'unassigned') return { assignedToId: null }
    return {}
  }
  if (assigned === 'unassigned') return { assignedToId: null }
  if (assigned === 'mine') return { assignedToId: actor.id }
  return { OR: [{ assignedToId: null }, { assignedToId: actor.id }] }
}

function enumValue<T extends string>(values: readonly T[], value?: string): T | undefined {
  return value && values.includes(value as T) ? value as T : undefined
}

async function listLeads(kind: LeadKind, actor: { id: string; role: UserRole }, query: z.output<typeof listQuery>) {
  const skip = (query.page - 1) * query.pageSize
  const assignment = assignmentWhere(actor, query.assigned)
  const scope = await getActorShowroomScope(actor)
  const showroomScope = showroomScopeWhere(scope)
  const pagination = { skip, take: query.pageSize }

  if (kind === 'enquiries') {
    const where: Prisma.InquiryWhereInput = {
      ...andFilters<Prisma.InquiryWhereInput>(
        assignment,
        showroomScope,
        enumValue(Object.values(InquiryStatus), query.status) ? { status: enumValue(Object.values(InquiryStatus), query.status) } : undefined,
        query.priority ? { priority: query.priority } : undefined,
        query.search ? { OR: [
        { referenceNumber: { contains: query.search, mode: 'insensitive' } },
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        ] } : undefined,
      ),
    }
    return Promise.all([
      prisma.inquiry.findMany({ where, ...pagination, orderBy: { submittedAt: 'desc' }, include: { vehicle: { select: { shortTitle: true } }, assignedTo: { select: { name: true } } } }),
      prisma.inquiry.count({ where }),
    ])
  }
  if (kind === 'test-drives') {
    const where: Prisma.TestDriveWhereInput = {
      ...andFilters<Prisma.TestDriveWhereInput>(
        assignment,
        showroomScope,
        enumValue(Object.values(TestDriveStatus), query.status) ? { status: enumValue(Object.values(TestDriveStatus), query.status) } : undefined,
        query.priority ? { priority: query.priority } : undefined,
        query.search ? { OR: [
        { referenceNumber: { contains: query.search, mode: 'insensitive' } },
        { fullName: { contains: query.search, mode: 'insensitive' } },
        ] } : undefined,
      ),
    }
    return Promise.all([
      prisma.testDrive.findMany({ where, ...pagination, orderBy: { submittedAt: 'desc' }, include: { vehicle: { select: { shortTitle: true } }, assignedTo: { select: { name: true } } } }),
      prisma.testDrive.count({ where }),
    ])
  }
  if (kind === 'sell-requests') {
    const where: Prisma.SellRequestWhereInput = {
      ...andFilters<Prisma.SellRequestWhereInput>(
        assignment,
        showroomScope,
        enumValue(Object.values(RequestStatus), query.status) ? { status: enumValue(Object.values(RequestStatus), query.status) } : undefined,
        query.priority ? { priority: query.priority } : undefined,
        query.search ? { OR: [
        { referenceNumber: { contains: query.search, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } },
        { make: { contains: query.search, mode: 'insensitive' } },
        { model: { contains: query.search, mode: 'insensitive' } },
        ] } : undefined,
      ),
    }
    return Promise.all([
      prisma.sellRequest.findMany({ where, ...pagination, orderBy: { createdAt: 'desc' }, include: { assignedTo: { select: { name: true } } } }),
      prisma.sellRequest.count({ where }),
    ])
  }
  const where: Prisma.ContactMessageWhereInput = {
    ...andFilters<Prisma.ContactMessageWhereInput>(
      assignment,
      showroomScope,
      enumValue(Object.values(ContactInquiryStatus), query.status) ? { status: enumValue(Object.values(ContactInquiryStatus), query.status) } : undefined,
      query.priority ? { priority: query.priority } : undefined,
      query.search ? { OR: [
      { referenceNumber: { contains: query.search, mode: 'insensitive' } },
      { name: { contains: query.search, mode: 'insensitive' } },
      { email: { contains: query.search, mode: 'insensitive' } },
      ] } : undefined,
    ),
  }
  return Promise.all([
    prisma.contactMessage.findMany({ where, ...pagination, orderBy: { createdAt: 'desc' }, include: { assignedTo: { select: { name: true } } } }),
    prisma.contactMessage.count({ where }),
  ])
}

export function leadCollectionHandlers(kind: LeadKind) {
  return {
    async GET(request: Request) {
      try {
        const actor = await authorizeAdminRequest(permissions[kind].view)
        const query = listQuery.parse(Object.fromEntries(new URL(request.url).searchParams))
        const [data, total] = await listLeads(kind, actor, query)
        return NextResponse.json({ data, pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.max(1, Math.ceil(total / query.pageSize)) } })
      } catch (error) {
        return adminError(error)
      }
    },
  }
}

export function leadDetailHandlers(kind: LeadKind) {
  return {
    async GET(_: Request, context: { params: Promise<{ id: string }> }) {
      try {
        const actor = await authorizeAdminRequest(permissions[kind].view)
        const { id } = await context.params
        const lead = await requireAccessibleLead(kind, id, actor)
        if (!lead) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Record not found.' } }, { status: 404 })
        const [messages, activity] = await Promise.all([
          prisma.operationalMessage.findMany({ where: { resourceType: leadResource[kind], resourceId: id }, orderBy: { createdAt: 'asc' }, include: { author: { select: { name: true } } } }),
          prisma.operationalActivity.findMany({ where: { resourceType: leadResource[kind], resourceId: id }, orderBy: { createdAt: 'desc' }, include: { actor: { select: { name: true } } } }),
        ])
        return NextResponse.json({ data: { lead, messages, activity } })
      } catch (error) {
        return adminError(error)
      }
    },
    async PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
      try {
        const actor = await authorizeAdminRequest(permissions[kind].update)
        const parsed = leadUpdateSchema.safeParse(await request.json().catch(() => null))
        if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors)
        const { id } = await context.params
        const result = await updateLead(kind, id, actor, parsed.data)
        if (result.type === 'not-found') return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Record not found.' } }, { status: 404 })
        if (result.type === 'conflict') return conflictError()
        if (result.type === 'invalid-transition') return NextResponse.json({ error: { code: 'INVALID_TRANSITION', message: 'That workflow transition is not allowed.' } }, { status: 422 })
        await writeAuditLog({ actorId: actor.id, action: `${leadResource[kind].toUpperCase()}_STATUS_CHANGED`, resourceType: leadResource[kind], resourceId: id, summary: `Updated ${leadResource[kind]} workflow status.`, request })
        return NextResponse.json({ data: result.data, message: 'Workflow updated.' })
      } catch (error) {
        return adminError(error)
      }
    },
  }
}

export function leadAssignHandler(kind: LeadKind) {
  return async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
      const actor = await authorizeAdminRequest(permissions[kind].assign)
      const parsed = assignmentSchema.safeParse(await request.json().catch(() => null))
      if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors)
      const { id } = await context.params
      const updated = await assignLead(kind, id, actor, parsed.data.assigneeId, parsed.data.version)
      if (!updated) return conflictError()
      await writeAuditLog({ actorId: actor.id, action: `${leadResource[kind].toUpperCase()}_ASSIGNED`, resourceType: leadResource[kind], resourceId: id, summary: 'Staff assignment updated.', metadata: { assigneeId: parsed.data.assigneeId }, request })
      return NextResponse.json({ data: updated, message: 'Assignment updated.' })
    } catch (error) {
      return adminError(error)
    }
  }
}

export function leadMessageHandler(kind: LeadKind, forceInternal = false) {
  return async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
      const actor = await authorizeAdminRequest(permissions[kind].update)
      const parsed = operationalMessageSchema.safeParse(await request.json().catch(() => null))
      if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors)
      const { id } = await context.params
      const input = {
        ...parsed.data,
        customerVisible: forceInternal ? false : parsed.data.customerVisible,
        type: forceInternal ? 'INTERNAL_NOTE' as const : parsed.data.type,
      }
      const added = await addLeadMessage(kind, id, actor, input)
      if (!added) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Record not found.' } }, { status: 404 })
      await writeAuditLog({ actorId: actor.id, action: input.customerVisible ? 'CUSTOMER_MESSAGE_ADDED' : 'INTERNAL_NOTE_ADDED', resourceType: leadResource[kind], resourceId: id, summary: input.customerVisible ? 'Customer-visible message added.' : 'Internal note added.', request })
      return NextResponse.json({ message: 'Message recorded.' }, { status: 201 })
    } catch (error) {
      return adminError(error)
    }
  }
}
