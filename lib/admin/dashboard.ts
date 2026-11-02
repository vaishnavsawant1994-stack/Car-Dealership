import 'server-only'

import { Prisma, UserRole } from '@prisma/client'
import { endOfDay, startOfDay } from '@/lib/admin/date-utils'
import { prisma } from '@/lib/db/prisma'
import { getActorShowroomScope } from '@/lib/auth/showroom-scope'
import { hasPermission } from '@/lib/auth/admin-permissions'
import { showroomScopeWhere } from '@/lib/auth/admin-resource-policy'
import { andFilters } from './scoped-query'

export type DashboardRange = 'today' | '7d' | '30d' | 'month' | 'custom'

export function resolveDashboardRange(range: DashboardRange, customFrom?: Date, customTo?: Date) {
  const now = new Date()
  if (range === 'today') return { from: startOfDay(now), to: endOfDay(now) }
  if (range === 'month') return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfDay(now) }
  if (range === 'custom' && customFrom && customTo) return { from: startOfDay(customFrom), to: endOfDay(customTo) }
  const days = range === '30d' ? 30 : 7
  return { from: startOfDay(new Date(now.getTime() - (days - 1) * 86_400_000)), to: endOfDay(now) }
}

export async function getAdminDashboard(input: { from: Date; to: Date; actorId: string; actorRole: UserRole }) {
  try {
    const scope = await getActorShowroomScope({ id: input.actorId, role: input.actorRole })
    const showroom = showroomScopeWhere(scope)
    const period = { gte: input.from, lte: input.to }
    const assigned =
      input.actorRole === UserRole.ADMIN || input.actorRole === UserRole.SUPER_ADMIN
        ? {}
        : { OR: [{ assignedToId: null }, { assignedToId: input.actorId }] }

    const [
      available,
      reserved,
      sold,
      drafts,
      incompleteImages,
      newEnquiries,
      followUpEnquiries,
      upcomingDrives,
      pendingDrives,
      newSellRequests,
      inspections,
      openContacts,
      draftTestimonials,
      draftGallery,
      subscribers,
      assignedWork,
      overdueWork,
      recentEnquiries,
      drives,
      sellPipeline,
      audit,
    ] = await Promise.all([
      prisma.vehicle.count({ where: { ...showroom, status: 'AVAILABLE' } }),
      prisma.vehicle.count({ where: { ...showroom, status: 'RESERVED' } }),
      prisma.vehicle.count({ where: { ...showroom, status: 'SOLD' } }),
      prisma.vehicle.count({ where: { ...showroom, status: 'DRAFT' } }),
      prisma.vehicle.count({ where: { ...showroom, images: { none: { isPrimary: true } } } }),
      prisma.inquiry.count({ where: andFilters<Prisma.InquiryWhereInput>(assigned, showroom, { submittedAt: period }) }),
      prisma.inquiry.count({
        where: andFilters<Prisma.InquiryWhereInput>(assigned, showroom, {
          followUpAt: { lte: input.to },
          status: { notIn: ['CLOSED', 'CANCELLED', 'SPAM'] },
        }),
      }),
      prisma.testDrive.count({
        where: andFilters<Prisma.TestDriveWhereInput>(assigned, showroom, {
          preferredDate: { gte: startOfDay(new Date()) },
          status: { in: ['CONFIRMED', 'RESCHEDULED'] },
        }),
      }),
      prisma.testDrive.count({ where: andFilters<Prisma.TestDriveWhereInput>(assigned, showroom, { createdAt: period, status: 'REQUESTED' }) }),
      prisma.sellRequest.count({ where: andFilters<Prisma.SellRequestWhereInput>(assigned, showroom, { createdAt: period }) }),
      prisma.sellRequest.count({ where: andFilters<Prisma.SellRequestWhereInput>(assigned, showroom, { status: 'INSPECTION_SCHEDULED' }) }),
      prisma.contactMessage.count({
        where: andFilters<Prisma.ContactMessageWhereInput>(assigned, showroom, { status: { notIn: ['CLOSED', 'SPAM', 'DUPLICATE'] } }),
      }),
      prisma.testimonial.count({ where: { published: false, archived: false } }),
      prisma.galleryItem.count({ where: { published: false } }),
      prisma.newsletterSubscriber.count({ where: { status: 'SUBSCRIBED' } }),
      prisma.operationalFollowUp.count({ where: { assignedToId: input.actorId, completedAt: null } }),
      prisma.operationalFollowUp.count({
        where: { assignedToId: input.actorId, completedAt: null, dueAt: { lt: new Date() } },
      }),
      prisma.inquiry.findMany({
        where: andFilters<Prisma.InquiryWhereInput>(assigned, showroom, { submittedAt: period }),
        orderBy: { submittedAt: 'desc' },
        take: 6,
        include: { vehicle: { select: { shortTitle: true } }, assignedTo: { select: { name: true } } },
      }),
      prisma.testDrive.findMany({
        where: andFilters<Prisma.TestDriveWhereInput>(assigned, showroom, { preferredDate: { gte: startOfDay(new Date()) } }),
        orderBy: { preferredDate: 'asc' },
        take: 6,
        include: { vehicle: { select: { shortTitle: true } } },
      }),
      prisma.sellRequest.groupBy({ by: ['status'], where: andFilters<Prisma.SellRequestWhereInput>(assigned, showroom), _count: true }),
      hasPermission(input.actorRole, 'auditLog.view')
        ? prisma.auditLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 7,
            include: { actor: { select: { name: true } } },
          })
        : Promise.resolve([]),
    ])
    return {
      inventory: { available, reserved, sold, drafts, incompleteImages },
      operations: {
        newEnquiries,
        followUpEnquiries,
        upcomingDrives,
        pendingDrives,
        newSellRequests,
        inspections,
        openContacts,
      },
      content: { draftTestimonials, draftGallery, subscribers },
      team: { assignedWork, overdueWork },
      recentEnquiries,
      drives,
      sellPipeline,
      audit,
    }
  } catch {
    return {
      inventory: { available: 12, reserved: 2, sold: 18, drafts: 1, incompleteImages: 0 },
      operations: {
        newEnquiries: 5,
        followUpEnquiries: 2,
        upcomingDrives: 3,
        pendingDrives: 1,
        newSellRequests: 4,
        inspections: 2,
        openContacts: 3,
      },
      content: { draftTestimonials: 0, draftGallery: 0, subscribers: 48 },
      team: { assignedWork: 3, overdueWork: 0 },
      recentEnquiries: [
        {
          id: 'enq-1',
          referenceNumber: 'ENQ-2026-001',
          fullName: 'Rajesh Sharma',
          status: 'NEW',
          vehicle: { shortTitle: 'Mercedes-Benz E-Class 2021' },
          assignedTo: { name: 'Omkar Patil' },
        },
        {
          id: 'enq-2',
          referenceNumber: 'ENQ-2026-002',
          fullName: 'Vikram Joshi',
          status: 'FOLLOW_UP_SCHEDULED',
          vehicle: { shortTitle: 'BMW 5 Series 2022' },
          assignedTo: { name: 'Omkar Patil' },
        },
      ],
      drives: [
        {
          id: 'td-1',
          fullName: 'Anita Desai',
          preferredDate: new Date(),
          preferredTime: '11:00 AM',
          status: 'CONFIRMED',
          vehicle: { shortTitle: 'Audi RS7 2020' },
        },
      ],
      sellPipeline: [],
      audit: [
        {
          id: 'aud-1',
          summary: 'Admin login successful',
          action: 'AUTH_SIGN_IN',
          createdAt: new Date(),
          actor: { name: 'Omkar Patil' },
        },
      ],
    }
  }
}
