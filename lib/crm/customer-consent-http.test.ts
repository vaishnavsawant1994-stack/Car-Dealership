import { UserRole } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/auth/require-permission', () => ({
  authorizeAdminRequest: vi.fn(),
  AdminPermissionError: class AdminPermissionError extends Error {
    constructor(public readonly permission: string) { super('Missing admin permission: ' + permission) }
  },
}))
vi.mock('@/lib/crm/customer-consent-service', () => ({
  withdrawCustomerMarketingConsent: vi.fn(),
}))

import { POST } from '@/app/api/admin/customers/[id]/privacy/withdraw/route'
import { authorizeAdminRequest, AdminPermissionError } from '@/lib/auth/require-permission'
import { withdrawCustomerMarketingConsent } from './customer-consent-service'

const request = (body: unknown) => new Request('https://car-dealership.test/api/admin/customers/fake/privacy/withdraw', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
})
const context = { params: Promise.resolve({ id: 'synthetic-customer' }) }

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(authorizeAdminRequest).mockResolvedValue({ id: 'synthetic-admin', role: UserRole.ADMIN } as Awaited<ReturnType<typeof authorizeAdminRequest>>)
  vi.mocked(withdrawCustomerMarketingConsent).mockResolvedValue({ type: 'withdrawn', channel: 'marketingEmails' })
})

describe('P4-03 consent withdrawal API access', () => {
  it('requires user.update and never returns promotional delivery permission', async () => {
    const response = await POST(request({ channel: 'marketingEmails' }), context)
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
    expect(authorizeAdminRequest).toHaveBeenCalledWith('user.update')
    expect(withdrawCustomerMarketingConsent).toHaveBeenCalledWith('synthetic-customer', 'synthetic-admin', 'marketingEmails')
    expect((await response.json()).data.allowed).toBe(false)
  })
  it('prevents a caller from enabling marketing or targeting another account', async () => {
    const response = await POST(request({ channel: 'marketingEmails', allowed: true }), context)
    expect(response.status).toBe(400)
    expect(withdrawCustomerMarketingConsent).not.toHaveBeenCalled()
  })
  it('checks permission before performing a privacy mutation', async () => {
    vi.mocked(authorizeAdminRequest).mockRejectedValue(new AdminPermissionError('user.update'))
    const response = await POST(request({ channel: 'whatsAppUpdates' }), context)
    expect(response.status).toBe(403)
    expect(withdrawCustomerMarketingConsent).not.toHaveBeenCalled()
  })
  it('does not disclose a missing customer', async () => {
    vi.mocked(withdrawCustomerMarketingConsent).mockResolvedValue({ type: 'not-found' })
    const response = await POST(request({ channel: 'marketingEmails' }), context)
    expect(response.status).toBe(404)
  })
})
