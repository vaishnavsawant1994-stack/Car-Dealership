import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/require-permission', () => ({
  authorizeAdminRequest: vi.fn(),
  AdminPermissionError: class AdminPermissionError extends Error {
    constructor(permission: string) { super(`Missing admin permission: ${permission}`) }
  },
}))
vi.mock('@/lib/sales/deal-service', () => ({
  listSalesDeals: vi.fn(), createSalesDeal: vi.fn(), transitionSalesDeal: vi.fn(),
}))

import { authorizeAdminRequest, AdminPermissionError } from '@/lib/auth/require-permission'
import { listSalesDeals, createSalesDeal, transitionSalesDeal } from '@/lib/sales/deal-service'
import { GET } from '@/app/api/admin/deals/route'
import { POST } from '@/app/api/admin/enquiries/[id]/deals/route'
import { PATCH } from '@/app/api/admin/deals/[id]/route'

const actor = { id: 'staff-1', role: 'SALES' as const }
const dealId = 'cmwz4wo8t0000dv1q55t01qkd'
const ctx = { params: Promise.resolve({ id: dealId }) }

beforeEach(() => vi.clearAllMocks())

describe('protected sales deal endpoints', () => {
  it('requires enquiry.view before listing and returns private no-store data', async () => {
    vi.mocked(authorizeAdminRequest).mockResolvedValue(actor as never)
    vi.mocked(listSalesDeals).mockResolvedValue([] as never)
    const response = await GET(new Request('https://dealer.test/api/admin/deals'))
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toContain('no-store')
    expect(authorizeAdminRequest).toHaveBeenCalledWith('enquiry.view')
  })

  it('stops denied deal creation before calling the service', async () => {
    vi.mocked(authorizeAdminRequest).mockRejectedValue(new AdminPermissionError('enquiry.update'))
    const response = await POST(new Request('https://dealer.test/api/admin/enquiries/x/deals', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quoteDraftId: dealId }),
    }), ctx)
    expect(response.status).toBe(403)
    expect(createSalesDeal).not.toHaveBeenCalled()
  })

  it('validates quote references before create and reports the internal-only outcome', async () => {
    vi.mocked(authorizeAdminRequest).mockResolvedValue(actor as never)
    vi.mocked(createSalesDeal).mockResolvedValue({ type: 'created', data: { id: dealId } } as never)
    const invalid = await POST(new Request('https://dealer.test/api/admin/enquiries/x/deals', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quoteDraftId: 'bad' }),
    }), ctx)
    expect(invalid.status).toBe(400)
    expect(createSalesDeal).not.toHaveBeenCalled()
    const response = await POST(new Request('https://dealer.test/api/admin/enquiries/x/deals', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quoteDraftId: dealId }),
    }), ctx)
    expect(response.status).toBe(201)
    expect((await response.json()).message).toContain('No vehicle reservation')
  })

  it('requires enquiry.update to transition and returns conflicts for invalid state changes', async () => {
    vi.mocked(authorizeAdminRequest).mockResolvedValue(actor as never)
    vi.mocked(transitionSalesDeal).mockResolvedValue({ type: 'invalid-transition', code: 'ACCEPTANCE_REQUIRED' } as never)
    const response = await PATCH(new Request('https://dealer.test/api/admin/deals/x', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: 1, status: 'WON' }),
    }), ctx)
    expect(authorizeAdminRequest).toHaveBeenCalledWith('enquiry.update')
    expect(response.status).toBe(409)
    expect((await response.json()).error.code).toBe('ACCEPTANCE_REQUIRED')
  })
})
