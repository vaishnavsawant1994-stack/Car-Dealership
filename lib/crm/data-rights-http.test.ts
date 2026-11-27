import { UserRole } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/auth/require-permission', () => ({
  authorizeAdminRequest: vi.fn(),
  AdminPermissionError: class AdminPermissionError extends Error {
    constructor(public readonly permission: string) { super('Missing admin permission: ' + permission) }
  },
}))
vi.mock('@/lib/crm/data-rights-service', () => ({
  createCustomerDataRightsRequest: vi.fn(),
  listCustomerDataRightsRequests: vi.fn(),
}))
vi.mock('@/lib/crm/customer-service', () => ({
  getCustomer360: vi.fn(),
}))

import { GET, POST } from '@/app/api/admin/customers/[id]/privacy/requests/route'
import { AdminPermissionError, authorizeAdminRequest } from '@/lib/auth/require-permission'
import { createCustomerDataRightsRequest, listCustomerDataRightsRequests } from './data-rights-service'
import { getCustomer360 } from './customer-service'

const req = (value: unknown) => new Request('https://car-dealership.test/api/admin/customers/id/privacy/requests', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value),
})
const ctx = { params: Promise.resolve({ id: 'fictional-customer' }) }

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(authorizeAdminRequest).mockResolvedValue({ id: 'fictional-admin', role: UserRole.ADMIN } as Awaited<ReturnType<typeof authorizeAdminRequest>>)
  vi.mocked(createCustomerDataRightsRequest).mockResolvedValue({ type: 'already-open', id: 'existing' })
  vi.mocked(getCustomer360).mockResolvedValue({ customer: { id: 'fictional-customer' } } as never)
  vi.mocked(listCustomerDataRightsRequests).mockResolvedValue([])
})

describe('P4-04 authenticated request intake API', () => {
  it('denies unapproved staff before creating requests', async () => {
    vi.mocked(authorizeAdminRequest).mockRejectedValue(new AdminPermissionError('user.update'))
    const response = await POST(req({ kind: 'ERASURE' }), ctx)
    expect(response.status).toBe(403)
    expect(createCustomerDataRightsRequest).not.toHaveBeenCalled()
  })
  it('rejects status injection and immediate-delete attempts', async () => {
    const response = await POST(req({ kind: 'ERASURE', executeNow: true }), ctx)
    expect(response.status).toBe(400)
    expect(createCustomerDataRightsRequest).not.toHaveBeenCalled()
  })
  it('returns a duplicate conflict for an open request', async () => {
    const response = await POST(req({ kind: 'ERASURE' }), ctx)
    expect(response.status).toBe(409)
    expect(createCustomerDataRightsRequest).toHaveBeenCalledWith('fictional-customer', 'fictional-admin', 'ERASURE')
  })
  it('restricts request list to eligible staff and no-store caching', async () => {
    const response = await GET(new Request('https://car-dealership.test/api/admin/customers/id/privacy/requests'), ctx)
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
    expect(authorizeAdminRequest).toHaveBeenCalledWith('user.update')
  })
})
