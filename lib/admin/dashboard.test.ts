import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { db, getScope } = vi.hoisted(() => {
  const method = () => vi.fn().mockResolvedValue([])
  return {
    db: {
      vehicle: { count: method() },
      inquiry: { count: method(), findMany: method() },
      testDrive: { count: method(), findMany: method() },
      sellRequest: { count: method(), groupBy: method() },
      contactMessage: { count: method() },
      testimonial: { count: method() },
      galleryItem: { count: method() },
      newsletterSubscriber: { count: method() },
      operationalFollowUp: { count: method() },
      auditLog: { findMany: method() },
    },
    getScope: vi.fn(),
  }
})

vi.mock('@/lib/db/prisma', () => ({ prisma: db }))
vi.mock('@/lib/auth/showroom-scope', () => ({ getActorShowroomScope: getScope }))

import { UserRole } from '@prisma/client'
import { getAdminDashboard } from './dashboard'

afterEach(() => {
  for (const model of Object.values(db)) {
    for (const method of Object.values(model)) method.mockClear()
  }
  getScope.mockReset()
})

describe('role and showroom scope for dashboard data', () => {
  it('limits the sales sell-request pipeline and omits audit data without audit permission', async () => {
    getScope.mockResolvedValue({ global: false, showroomIds: ['showroom-a'] })

    await getAdminDashboard({
      from: new Date('2026-01-01T00:00:00.000Z'),
      to: new Date('2026-01-31T23:59:59.999Z'),
      actorId: 'sales-a',
      actorRole: UserRole.SALES,
    })

    expect(db.sellRequest.groupBy).toHaveBeenCalledWith({
      by: ['status'],
      where: {
        AND: [
          { OR: [{ assignedToId: null }, { assignedToId: 'sales-a' }] },
          { showroomId: { in: ['showroom-a'] } },
        ],
      },
      _count: true,
    })
    expect(db.auditLog.findMany).not.toHaveBeenCalled()
    expect(db.testimonial.count).not.toHaveBeenCalled()
    expect(db.galleryItem.count).not.toHaveBeenCalled()
  })

  it('includes audit data for administrators with explicit audit permission', async () => {
    getScope.mockResolvedValue({ global: true, showroomIds: [] })

    await getAdminDashboard({
      from: new Date('2026-01-01T00:00:00.000Z'),
      to: new Date('2026-01-31T23:59:59.999Z'),
      actorId: 'admin-a',
      actorRole: UserRole.ADMIN,
    })

    expect(db.auditLog.findMany).toHaveBeenCalledOnce()
  })

  it('loads each content alert only for roles with that content permission', async () => {
    getScope.mockResolvedValue({ global: false, showroomIds: ['showroom-content'] })

    const data = await getAdminDashboard({
      from: new Date('2026-01-01T00:00:00.000Z'),
      to: new Date('2026-01-31T23:59:59.999Z'),
      actorId: 'content-a',
      actorRole: UserRole.CONTENT_MANAGER,
    })

    expect(db.inquiry.count).not.toHaveBeenCalled()
    expect(db.inquiry.findMany).not.toHaveBeenCalled()
    expect(db.testDrive.count).not.toHaveBeenCalled()
    expect(db.testDrive.findMany).not.toHaveBeenCalled()
    expect(db.sellRequest.count).not.toHaveBeenCalled()
    expect(db.sellRequest.groupBy).not.toHaveBeenCalled()
    expect(db.contactMessage.count).not.toHaveBeenCalled()
    expect(data.operations).toEqual({ newEnquiries: 0, followUpEnquiries: 0, upcomingDrives: 0, pendingDrives: 0, newSellRequests: 0, inspections: 0, openContacts: 0 })
    expect(data.recentEnquiries).toEqual([])
    expect(data.drives).toEqual([])
    expect(data.sellPipeline).toEqual([])
    expect(db.testimonial.count).toHaveBeenCalledOnce()
    expect(db.galleryItem.count).toHaveBeenCalledOnce()
    expect(db.newsletterSubscriber.count).not.toHaveBeenCalled()
  })

  it('returns no canned rows when the database is unavailable', async () => {
    getScope.mockResolvedValue({ global: false, showroomIds: ['showroom-a'] })
    db.vehicle.count.mockRejectedValueOnce(new Error('database unavailable'))

    const data = await getAdminDashboard({
      from: new Date('2026-01-01T00:00:00.000Z'),
      to: new Date('2026-01-31T23:59:59.999Z'),
      actorId: 'sales-a',
      actorRole: UserRole.SALES,
    })

    expect(data.sourceAvailable).toBe(false)
    expect(data.inventory).toEqual({ available: 0, reserved: 0, sold: 0, drafts: 0, incompleteImages: 0 })
    expect(data.recentEnquiries).toEqual([])
    expect(data.drives).toEqual([])
    expect(data.audit).toEqual([])
  })
})
