import { UserRole } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/auth/require-permission', () => ({
  authorizeAdminRequest: vi.fn(),
  AdminPermissionError: class AdminPermissionError extends Error {
    constructor(public readonly permission: string) {
      super('Missing admin permission: ' + permission)
    }
  },
}))
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    adminNotification: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}))

import { GET, PATCH as MARK_ALL } from '@/app/api/admin/notifications/route'
import { PATCH as MARK_ONE } from '@/app/api/admin/notifications/[id]/route'
import { AdminPermissionError, authorizeAdminRequest } from '@/lib/auth/require-permission'
import { prisma } from '@/lib/db/prisma'

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(authorizeAdminRequest).mockResolvedValue({
    id: 'synthetic-staff', role: UserRole.SALES,
  } as Awaited<ReturnType<typeof authorizeAdminRequest>>)
  vi.mocked(prisma.adminNotification.findMany).mockResolvedValue([])
  vi.mocked(prisma.adminNotification.updateMany).mockResolvedValue({ count: 1 })
})

describe('P1-07 notification HTTP permissions', () => {
  it('restricts inbox queries to the authenticated staff identity', async () => {
    const response = await GET(new Request('https://car-dealership.test/api/admin/notifications?unread=true'))
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
    expect(authorizeAdminRequest).toHaveBeenCalledWith('notification.view')
    expect(prisma.adminNotification.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'synthetic-staff', readAt: null },
      take: 100,
    }))
  })

  it('rejects an invalid inbox filter', async () => {
    const response = await GET(new Request('https://car-dealership.test/api/admin/notifications?unread=all'))
    expect(response.status).toBe(400)
    expect(prisma.adminNotification.findMany).not.toHaveBeenCalled()
  })

  it('marks only the current recipient notifications as read', async () => {
    const response = await MARK_ALL()
    expect(response.status).toBe(200)
    expect(prisma.adminNotification.updateMany).toHaveBeenCalledWith({
      where: { userId: 'synthetic-staff', readAt: null },
      data: { readAt: expect.any(Date) },
    })
  })

  it('returns 404 for another user notification', async () => {
    vi.mocked(prisma.adminNotification.findFirst).mockResolvedValue(null)
    const response = await MARK_ONE(new Request('https://car-dealership.test/api/admin/notifications/other'), {
      params: Promise.resolve({ id: 'other' }),
    })
    expect(response.status).toBe(404)
    expect(prisma.adminNotification.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'other', userId: 'synthetic-staff' },
    }))
    expect(prisma.adminNotification.updateMany).not.toHaveBeenCalled()
  })

  it('preserves a previously recorded read timestamp', async () => {
    vi.mocked(prisma.adminNotification.findFirst).mockResolvedValue({ id: 'notice', readAt: new Date('2026-01-01T00:00:00Z') } as never)
    const response = await MARK_ONE(new Request('https://car-dealership.test/api/admin/notifications/notice'), {
      params: Promise.resolve({ id: 'notice' }),
    })
    expect(response.status).toBe(200)
    expect(prisma.adminNotification.updateMany).not.toHaveBeenCalled()
  })

  it('rejects unauthorized API access before querying the database', async () => {
    vi.mocked(authorizeAdminRequest).mockRejectedValue(new AdminPermissionError('notification.view'))
    const response = await GET(new Request('https://car-dealership.test/api/admin/notifications'))
    expect(response.status).toBe(403)
    expect(prisma.adminNotification.findMany).not.toHaveBeenCalled()
  })
})
