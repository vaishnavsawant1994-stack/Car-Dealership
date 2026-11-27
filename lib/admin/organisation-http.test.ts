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
vi.mock('@/lib/admin/organisation-service', () => ({
  getOrganisationProfile: vi.fn(),
  updateOrganisationProfile: vi.fn(),
  OrganisationProfileConflict: class OrganisationProfileConflict extends Error {
    constructor() { super('The organisation profile has changed. Reload and try again.') }
  },
  OrganisationProfileValidationError: class OrganisationProfileValidationError extends Error {
    constructor(public readonly fields: Record<string, string>) { super('Invalid profile values.') }
  },
}))

import { GET, PATCH } from '@/app/api/admin/organisation/route'
import { authorizeAdminRequest, AdminPermissionError } from '@/lib/auth/require-permission'
import {
  getOrganisationProfile, updateOrganisationProfile,
  OrganisationProfileConflict,
} from '@/lib/admin/organisation-service'

const record = {
  settings: { site_name: { value: 'Car Dealership Demo', version: 2 } },
  primaryShowroom: null,
  showroomCount: 0,
} as Awaited<ReturnType<typeof getOrganisationProfile>>

function edit(body: unknown) {
  return new Request('https://car-dealership.test/api/admin/organisation', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(authorizeAdminRequest).mockResolvedValue({
    id: 'fictional-admin', role: 'ADMIN',
  } as Awaited<ReturnType<typeof authorizeAdminRequest>>)
  vi.mocked(getOrganisationProfile).mockResolvedValue(record)
  vi.mocked(updateOrganisationProfile).mockResolvedValue(record)
})

describe('P1-02 organisation admin HTTP contract', () => {
  it('requires settings.view to read the profile and disables response caching', async () => {
    const response = await GET()
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
    expect(authorizeAdminRequest).toHaveBeenCalledWith('settings.view')
    expect((await response.json()).data.settings.site_name.value).toBe('Car Dealership Demo')
  })

  it('rejects unauthenticated access before database reads', async () => {
    vi.mocked(authorizeAdminRequest).mockRejectedValue(new AdminPermissionError('settings.view'))
    const response = await GET()
    expect(response.status).toBe(403)
    expect(getOrganisationProfile).not.toHaveBeenCalled()
  })

  it('rejects unexpected changes before calling the persistence service', async () => {
    const response = await PATCH(edit({ changes: [{ key: 'api_secret', value: 'exfiltrate', version: 0 }] }))
    expect(response.status).toBe(400)
    expect(updateOrganisationProfile).not.toHaveBeenCalled()
  })

  it('persists valid updates only after settings.update authorization', async () => {
    const payload = { changes: [{ key: 'site_name', value: 'Car Dealership Demo', version: 2 }] }
    const response = await PATCH(edit(payload))
    expect(response.status).toBe(200)
    expect(authorizeAdminRequest).toHaveBeenCalledWith('settings.update')
    expect(updateOrganisationProfile).toHaveBeenCalledWith('fictional-admin', payload.changes)
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
  })

  it('denies writes when permissions are missing', async () => {
    vi.mocked(authorizeAdminRequest).mockRejectedValue(new AdminPermissionError('settings.update'))
    const response = await PATCH(edit({ changes: [{ key: 'site_name', value: 'Car Dealership Demo', version: 2 }] }))
    expect(response.status).toBe(403)
    expect(updateOrganisationProfile).not.toHaveBeenCalled()
  })

  it('returns HTTP 409 on a stale-version transaction', async () => {
    vi.mocked(updateOrganisationProfile).mockRejectedValue(new OrganisationProfileConflict())
    const response = await PATCH(edit({ changes: [{ key: 'site_name', value: 'Car Dealership Demo', version: 1 }] }))
    expect(response.status).toBe(409)
    expect((await response.json()).error.code).toBe('EDIT_CONFLICT')
  })
})
