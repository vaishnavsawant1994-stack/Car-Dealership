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
})
