import { UserRole } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/auth/require-permission', () => ({
  authorizeAdminRequest: vi.fn(),
  AdminPermissionError: class AdminPermissionError extends Error {
    constructor(public readonly permission: string) { super('Missing admin permission: ' + permission) }
  },
}))
vi.mock('@/lib/sales/opportunity-service', () => ({
  getSalesOpportunityBoard: vi.fn(),
}))

import { GET } from '@/app/api/admin/sales/opportunities/route'
import { AdminPermissionError, authorizeAdminRequest } from '@/lib/auth/require-permission'
import { getSalesOpportunityBoard } from './opportunity-service'

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(authorizeAdminRequest).mockResolvedValue({ id: 'sales-1', role: UserRole.SALES } as Awaited<ReturnType<typeof authorizeAdminRequest>>)
  vi.mocked(getSalesOpportunityBoard).mockResolvedValue({
    items: [], stageCounts: { new: 0, engaged: 0, scheduled: 0, completed: 0, closed: 0, lost: 0 },
    matchingTotal: 0, shown: 0, maxShown: 100,
  })
})

describe('P5-01 sales opportunity staff API', () => {
  it('requires both enquiry and test-drive access and uses private no-store caching', async () => {
    const response = await GET(new Request('https://car-dealership.test/api/admin/sales/opportunities?stage=scheduled&assignment=mine'))
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
    expect(authorizeAdminRequest).toHaveBeenCalledWith('enquiry.view')
    expect(authorizeAdminRequest).toHaveBeenCalledWith('testDrive.view')
    expect(getSalesOpportunityBoard).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'sales-1' }),
      { stage: 'scheduled', assignment: 'mine' },
    )
  })
  it('rejects unauthorized requests before reading any leads', async () => {
    vi.mocked(authorizeAdminRequest).mockRejectedValue(new AdminPermissionError('enquiry.view'))
    const response = await GET(new Request('https://car-dealership.test/api/admin/sales/opportunities'))
    expect(response.status).toBe(403)
    expect(getSalesOpportunityBoard).not.toHaveBeenCalled()
  })
})
