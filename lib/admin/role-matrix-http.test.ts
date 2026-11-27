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

import { GET } from '@/app/api/admin/roles/route'
import { AdminPermissionError, authorizeAdminRequest } from '@/lib/auth/require-permission'

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(authorizeAdminRequest).mockResolvedValue({
    id: 'fictional-admin', role: UserRole.ADMIN,
  } as Awaited<ReturnType<typeof authorizeAdminRequest>>)
})

describe('P1-05 role permission API read protection', () => {
  it('requires user.view and returns only effective public role-policy metadata', async () => {
    const response = await GET()
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
    expect(authorizeAdminRequest).toHaveBeenCalledWith('user.view')
    const data = (await response.json()).data
    expect(data.roles).toHaveLength(Object.values(UserRole).length)
    expect(data.permissions.length).toBeGreaterThan(10)
    expect(JSON.stringify(data)).not.toContain('passwordHash')
    expect(JSON.stringify(data)).not.toContain('sessionVersion')
  })
  it('rejects accounts lacking the role-permission view grant', async () => {
    vi.mocked(authorizeAdminRequest).mockRejectedValue(new AdminPermissionError('user.view'))
    const response = await GET()
    expect(response.status).toBe(403)
  })
})
