import { UserRole } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/auth/require-permission', () => ({
  authorizeAdminRequest: vi.fn(),
  AdminPermissionError: class AdminPermissionError extends Error {
    constructor(public readonly permission: string) { super('Missing admin permission: ' + permission) }
  },
}))
vi.mock('@/lib/sales/quote-service', () => ({
  getSalesQuoteDrafts: vi.fn(),
  createSalesQuoteDraft: vi.fn(),
}))

import { GET, POST } from '@/app/api/admin/enquiries/[id]/quotes/route'
import { authorizeAdminRequest, AdminPermissionError } from '@/lib/auth/require-permission'
import { getSalesQuoteDrafts, createSalesQuoteDraft } from './quote-service'

const ctx = { params: Promise.resolve({ id: 'synthetic-enquiry' }) }
const request = (input: unknown) => new Request('https://car-dealership.test/api/admin/enquiries/synthetic-enquiry/quotes', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
})

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(authorizeAdminRequest).mockResolvedValue({
    id: 'synthetic-admin', role: UserRole.ADMIN,
  } as Awaited<ReturnType<typeof authorizeAdminRequest>>)
  vi.mocked(getSalesQuoteDrafts).mockResolvedValue(null)
  vi.mocked(createSalesQuoteDraft).mockResolvedValue({ type: 'not-available' })
})

describe('P5-02 protected internal quote endpoints', () => {
  it('refuses unauthorized quote creation before hitting pricing or database', async () => {
    vi.mocked(authorizeAdminRequest).mockRejectedValue(new AdminPermissionError('enquiry.update'))
    const response = await POST(request({ discountAmount: 0, estimatedOtherFees: 0 }), ctx)
    expect(response.status).toBe(403)
    expect(createSalesQuoteDraft).not.toHaveBeenCalled()
  })
  it('rejects attempts to send payments, bills or marketing messages', async () => {
    const response = await POST(request({ discountAmount: 0, estimatedOtherFees: 0, issueInvoice: true }), ctx)
    expect(response.status).toBe(400)
    expect(createSalesQuoteDraft).not.toHaveBeenCalled()
  })
  it('does not create quotes on unavailable vehicles', async () => {
    const response = await POST(request({ discountAmount: 0, estimatedOtherFees: 0 }), ctx)
    expect(response.status).toBe(409)
    expect(createSalesQuoteDraft).toHaveBeenCalledWith('synthetic-enquiry',
      expect.objectContaining({ id: 'synthetic-admin' }),
      { discountAmount: 0, estimatedOtherFees: 0 })
  })
  it('denies disallowed or nonexistent quote-history access', async () => {
    const response = await GET(new Request('https://car-dealership.test/api/admin/enquiries/synthetic-enquiry/quotes'), ctx)
    expect(response.status).toBe(404)
  })
})
