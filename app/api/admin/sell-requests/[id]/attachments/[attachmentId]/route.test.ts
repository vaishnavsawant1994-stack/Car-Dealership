import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  getScope: vi.fn(),
  findLead: vi.fn(),
  accessibleWhere: vi.fn(),
  canAccessScopedResource: vi.fn(),
  findAttachment: vi.fn(),
  readAttachment: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/admin/api', () => ({ adminError: () => new Response('error', { status: 500 }) }))
vi.mock('@/lib/admin/lead-service', () => ({ findLead: mocks.findLead }))
vi.mock('@/lib/auth/admin-resource-policy', () => ({
  accessibleResourceWhere: mocks.accessibleWhere,
  canAccessScopedResource: mocks.canAccessScopedResource,
  mayViewPrivateDocuments: () => true,
}))
vi.mock('@/lib/auth/showroom-scope', () => ({ getActorShowroomScope: mocks.getScope }))
vi.mock('@/lib/auth/require-permission', () => ({ authorizeAdminRequest: mocks.authorize }))
vi.mock('@/lib/db/prisma', () => ({ prisma: { sellRequestAttachment: { findFirst: mocks.findAttachment } } }))
vi.mock('@/lib/storage/sell-request-storage', () => ({ readSellAttachment: mocks.readAttachment }))

import { GET } from './route'

const actor = { id: 'operations-a', role: 'OPERATIONS' as const }
const scope = { global: false as const, showroomIds: ['showroom-a'] }
const parentWhere = {
  showroomId: { in: ['showroom-a'] },
  OR: [{ assignedToId: null }, { assignedToId: actor.id }],
}
const context = { params: Promise.resolve({ id: 'request-a', attachmentId: 'attachment-a' }) }
const request = () => new Request('https://car-dealership.test/api/admin/sell-requests/request-a/attachments/attachment-a')

describe('sell request attachment showroom authorization', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.authorize.mockResolvedValue(actor)
    mocks.getScope.mockResolvedValue(scope)
    mocks.findLead.mockResolvedValue({ id: 'request-a', showroomId: 'showroom-a', assignedToId: null })
    mocks.accessibleWhere.mockReturnValue(parentWhere)
    mocks.canAccessScopedResource.mockReturnValue(true)
    mocks.findAttachment.mockResolvedValue({
      id: 'attachment-a',
      originalName: 'registration.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 3,
      storageKey: 'sell-requests/request-a/registration.pdf',
    })
    mocks.readAttachment.mockResolvedValue(new Uint8Array([1, 2, 3]))
  })

  it('repeats showroom and assignment scope in the attachment query', async () => {
    const response = await GET(request(), context)

    expect(response.status).toBe(200)
    expect(mocks.findAttachment).toHaveBeenCalledWith({
      where: {
        id: 'attachment-a',
        sellRequestId: 'request-a',
        sellRequest: { is: parentWhere },
      },
    })
    expect(mocks.readAttachment).toHaveBeenCalledWith('sell-requests/request-a/registration.pdf')
  })

  it('does not query or read an attachment when the parent is outside the actor scope', async () => {
    mocks.canAccessScopedResource.mockReturnValue(false)

    const response = await GET(request(), context)

    expect(response.status).toBe(404)
    expect(mocks.findAttachment).not.toHaveBeenCalled()
    expect(mocks.readAttachment).not.toHaveBeenCalled()
  })
})
