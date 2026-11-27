import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  getScope: vi.fn(),
  inquiryFindMany: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/auth/require-permission', () => ({ authorizeAdminRequest: mocks.authorize }))
vi.mock('@/lib/auth/showroom-scope', () => ({ getActorShowroomScope: mocks.getScope }))
vi.mock('@/lib/db/prisma', () => ({ prisma: { inquiry: { findMany: mocks.inquiryFindMany } } }))

import { GET } from './[resource]/route'

describe('admin resource exports route', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.authorize.mockResolvedValue({ id: 'operations-user', role: 'OPERATIONS' })
  })

  it('denies Operations enquiry exports before scope or data queries', async () => {
    const request = new Request('https://car-dealership.test/api/admin/exports/enquiries')
    const response = await GET(request, { params: Promise.resolve({ resource: 'enquiries' }) })

    expect(response.status).toBe(403)
    expect(mocks.authorize).toHaveBeenCalledWith('export.create')
    expect(mocks.getScope).not.toHaveBeenCalled()
    expect(mocks.inquiryFindMany).not.toHaveBeenCalled()
  })
})
