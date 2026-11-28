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
    const canViewEnquiries = hasPermission(input.actorRole, 'enquiry.view')
    const canViewTestDrives = hasPermission(input.actorRole, 'testDrive.view')
    const canViewSellRequests = hasPermission(input.actorRole, 'sellRequest.view')
    const canViewContactInquiries = hasPermission(input.actorRole, 'contactInquiry.view')
    const canViewVehicles = hasPermission(input.actorRole, 'vehicle.view')

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
      assignedWork,
      overdueWork,
      recentEnquiries,
      drives,
      sellPipeline,
      audit,
    ] = await Promise.all([
      canViewVehicles ? prisma.vehicle.count({ where: { ...showroom, status: 'AVAILABLE' } }) : Promise.resolve(0),
      canViewVehicles ? prisma.vehicle.count({ where: { ...showroom, status: 'RESERVED' } }) : Promise.resolve(0),
      canViewVehicles ? prisma.vehicle.count({ where: { ...showroom, status: 'SOLD' } }) : Promise.resolve(0),
      canViewVehicles ? prisma.vehicle.count({ where: { ...showroom, status: 'DRAFT' } }) : Promise.resolve(0),
      canViewVehicles ? prisma.vehicle.count({ where: { ...showroom, images: { none: { isPrimary: true } } } }) : Promise.resolve(0),
      canViewEnquiries ? prisma.inquiry.count({ where: andFilters<Prisma.InquiryWhereInput>(assigned, showroom, { submittedAt: period }) }) : Promise.resolve(0),
      canViewEnquiries ? prisma.inquiry.count({
        where: andFilters<Prisma.InquiryWhereInput>(assigned, showroom, {
          followUpAt: { lte: input.to },
          status: { notIn: ['CLOSED', 'CANCELLED', 'SPAM'] },
        }),
      }) : Promise.resolve(0),
      canViewTestDrives ? prisma.testDrive.count({
        where: andFilters<Prisma.TestDriveWhereInput>(assigned, showroom, {
          preferredDate: { gte: startOfDay(new Date()) },
          status: { in: ['CONFIRMED', 'RESCHEDULED'] },
        }),
      }) : Promise.resolve(0),
      canViewTestDrives ? prisma.testDrive.count({ where: andFilters<Prisma.TestDriveWhereInput>(assigned, showroom, { createdAt: period, status: 'REQUESTED' }) }) : Promise.resolve(0),
      canViewSellRequests ? prisma.sellRequest.count({ where: andFilters<Prisma.SellRequestWhereInput>(assigned, showroom, { createdAt: period }) }) : Promise.resolve(0),
      canViewSellRequests ? prisma.sellRequest.count({ where: andFilters<Prisma.SellRequestWhereInput>(assigned, showroom, { status: 'INSPECTION_SCHEDULED' }) }) : Promise.resolve(0),
      canViewContactInquiries ? prisma.contactMessage.count({
        where: andFilters<Prisma.ContactMessageWhereInput>(assigned, showroom, { status: { notIn: ['CLOSED', 'SPAM', 'DUPLICATE'] } }),
      }) : Promise.resolve(0),
      hasPermission(input.actorRole, 'testimonial.manage')
        ? prisma.testimonial.count({ where: { published: false, archived: false } })
        : Promise.resolve(0),
      hasPermission(input.actorRole, 'gallery.manage')
        ? prisma.galleryItem.count({ where: { published: false } })
        : Promise.resolve(0),
      prisma.operationalFollowUp.count({ where: { assignedToId: input.actorId, completedAt: null } }),
      prisma.operationalFollowUp.count({
        where: { assignedToId: input.actorId, completedAt: null, dueAt: { lt: new Date() } },
      }),
      canViewEnquiries ? prisma.inquiry.findMany({
        where: andFilters<Prisma.InquiryWhereInput>(assigned, showroom, { submittedAt: period }),
        orderBy: { submittedAt: 'desc' },
        take: 6,
        include: { vehicle: { select: { shortTitle: true } }, assignedTo: { select: { name: true } } },
      }) : Promise.resolve([]),
      canViewTestDrives ? prisma.testDrive.findMany({
        where: andFilters<Prisma.TestDriveWhereInput>(assigned, showroom, { preferredDate: { gte: startOfDay(new Date()) } }),
        orderBy: { preferredDate: 'asc' },
        take: 6,
        include: { vehicle: { select: { shortTitle: true } } },
      }) : Promise.resolve([]),
      canViewSellRequests ? prisma.sellRequest.groupBy({ by: ['status'], where: andFilters<Prisma.SellRequestWhereInput>(assigned, showroom), _count: true }) : Promise.resolve([]),
      hasPermission(input.actorRole, 'auditLog.view')
        ? prisma.auditLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 7,
            include: { actor: { select: { name: true } } },
          })
        : Promise.resolve([]),
    ])
    return {
      sourceAvailable: true,
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
      content: { draftTestimonials, draftGallery },
      team: { assignedWork, overdueWork },
      recentEnquiries,
      drives,
      sellPipeline,
      audit,
    }
  } catch {
    return {
      sourceAvailable: false,
      inventory: { available: 0, reserved: 0, sold: 0, drafts: 0, incompleteImages: 0 },
      operations: {
        newEnquiries: 0,
        followUpEnquiries: 0,
        upcomingDrives: 0,
        pendingDrives: 0,
        newSellRequests: 0,
        inspections: 0,
        openContacts: 0,
      },
      content: { draftTestimonials: 0, draftGallery: 0 },
      team: { assignedWork: 0, overdueWork: 0 },
      recentEnquiries: [],
      drives: [],
      sellPipeline: [],
      audit: [],
    }
  }
}
