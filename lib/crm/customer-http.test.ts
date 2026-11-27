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
vi.mock('@/lib/crm/customer-service', () => ({
  listCustomers: vi.fn(),
  getCustomer360: vi.fn(),
}))

import { GET as LIST } from '@/app/api/admin/customers/route'
import { GET as DETAIL } from '@/app/api/admin/customers/[id]/route'
import { AdminPermissionError, authorizeAdminRequest } from '@/lib/auth/require-permission'
import { getCustomer360, listCustomers } from './customer-service'

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(authorizeAdminRequest).mockResolvedValue({ id: 'synthetic-admin', role: UserRole.ADMIN } as Awaited<ReturnType<typeof authorizeAdminRequest>>)
  vi.mocked(listCustomers).mockResolvedValue({
    data: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 1 },
  } as never)
  vi.mocked(getCustomer360).mockResolvedValue(null)
})

describe('P4-01 customer 360 HTTP access boundaries', () => {
  it('only grants the directory to staff with user.view and disables shared caching', async () => {
    const response = await LIST(new Request('https://car-dealership.test/api/admin/customers?page=2&status=ACTIVE'))
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
    expect(authorizeAdminRequest).toHaveBeenCalledWith('user.view')
    expect(listCustomers).toHaveBeenCalledWith(expect.objectContaining({ page: 2, status: 'ACTIVE' }))
  })
  it('denies unauthorized reads before evaluating any customer profile', async () => {
    vi.mocked(authorizeAdminRequest).mockRejectedValue(new AdminPermissionError('user.view'))
    const response = await DETAIL(new Request('https://car-dealership.test/api/admin/customers/private'), {
      params: Promise.resolve({ id: 'private' }),
    })
    expect(response.status).toBe(403)
    expect(getCustomer360).not.toHaveBeenCalled()
  })
  it('does not reveal whether a missing or noncustomer account exists', async () => {
    const response = await DETAIL(new Request('https://car-dealership.test/api/admin/customers/unknown'), {
      params: Promise.resolve({ id: 'unknown' }),
    })
    expect(response.status).toBe(404)
    expect((await response.json()).error.code).toBe('NOT_FOUND')
  })
  it('uses the exact account identifier and protects private detail caching', async () => {
    vi.mocked(getCustomer360).mockResolvedValue({ customer: { id: 'synthetic-customer' } } as never)
    const response = await DETAIL(new Request('https://car-dealership.test/api/admin/customers/synthetic-customer'), {
      params: Promise.resolve({ id: 'synthetic-customer' }),
    })
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
    expect(getCustomer360).toHaveBeenCalledWith('synthetic-customer')
  })
})
