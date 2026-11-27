import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { UserRole } from '@prisma/client'
import { hasPermission } from '@/lib/auth/admin-permissions'

function route(path: string) {
  return readFileSync(new URL('../../' + path, import.meta.url), 'utf8')
}

describe('P1-03 branch API boundaries', () => {
  it('requires showroom.manage on every branch mutation and roster endpoint', () => {
    for (const path of [
      'app/api/admin/showrooms/route.ts',
      'app/api/admin/showrooms/[id]/route.ts',
      'app/api/admin/showrooms/[id]/staff/route.ts',
      'app/api/admin/showrooms/[id]/staff/[userId]/route.ts',
    ]) {
      expect(route(path)).toContain("authorizeAdminRequest('showroom.manage')")
    }
  })
  it('requires staff dashboard permission and the current actor ID for personal branches', () => {
    const source = route('app/api/admin/my-showrooms/route.ts')
    expect(source).toContain("authorizeAdminRequest('dashboard.view')")
    expect(source).toContain('myActiveShowrooms(actor.id)')
    expect(hasPermission(UserRole.SALES, 'dashboard.view')).toBe(true)
    expect(hasPermission(UserRole.SALES, 'showroom.manage')).toBe(false)
    expect(hasPermission(UserRole.CUSTOMER, 'dashboard.view')).toBe(false)
  })
  it('never returns broad User records or passwords from roster queries', () => {
    const source = route('lib/admin/showroom-service.ts')
    expect(source).toContain('select: { id: true, name: true, email: true, role: true')
    expect(source).not.toContain('passwordHash: true')
    expect(source).toContain('where: { userId, showroom: { active: true } }')
  })
})
