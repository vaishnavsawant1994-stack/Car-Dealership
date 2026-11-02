import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  update: vi.fn(),
  writeAuditLog: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/auth/require-permission', () => ({
  authorizeAdminRequest: mocks.authorize,
  AdminPermissionError: class AdminPermissionError extends Error {
    constructor(public readonly permission: string) {
      super(`Missing admin permission: ${permission}`)
    }
  },
}))
vi.mock('@/lib/admin/audit', () => ({ writeAuditLog: mocks.writeAuditLog }))
vi.mock('@/lib/db/prisma', () => ({ prisma: { newsletterSubscriber: { update: mocks.update } } }))

import { PATCH } from './route'
import { authorizeAdminRequest, AdminPermissionError } from '@/lib/auth/require-permission'

const context = { params: Promise.resolve({ id: 'subscriber-id' }) }
const request = () => new Request('https://car-dealership.test/api/admin/newsletter/subscriber-id', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: 'SUPPRESSED' }),
})

describe('newsletter status update authorization', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.authorize.mockResolvedValue({ id: 'content-manager', role: 'CONTENT_MANAGER' })
    mocks.update.mockResolvedValue({ id: 'subscriber-id', status: 'SUPPRESSED' })
    mocks.writeAuditLog.mockResolvedValue(undefined)
  })

  it('requires the existing content.manage operation permission', async () => {
    const response = await PATCH(request(), context)

    expect(response.status).toBe(200)
    expect(authorizeAdminRequest).toHaveBeenCalledWith('content.manage')
    expect(mocks.update).toHaveBeenCalledOnce()
  })

  it('denies a role without content.manage before writing subscriber state', async () => {
    mocks.authorize.mockRejectedValue(new AdminPermissionError('content.manage'))

    const response = await PATCH(request(), context)

    expect(response.status).toBe(403)
    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.writeAuditLog).not.toHaveBeenCalled()
  })
})
