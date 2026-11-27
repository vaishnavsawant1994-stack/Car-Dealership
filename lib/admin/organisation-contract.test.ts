import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { hasPermission } from '@/lib/auth/admin-permissions'
import { UserRole } from '@prisma/client'

// Tests the shared guard wiring on both update paths. Full authenticated
// E2E is P0-06 acceptance work, not presumed from this source-level check.
describe('P1-02 legacy settings guard integration', () => {
  it('routes the pre-existing settings PATCH through the profile value policy', () => {
    const route = readFileSync(new URL('../../app/api/admin/settings/[key]/route.ts', import.meta.url), 'utf8')
    expect(route).toContain('validateOrganisationValue(')
    expect(route).toContain('getCarDealershipEnvironment()')
    expect(route).toContain("authorizeAdminRequest('settings.update')")
  })
  it('requires role checks on the new organisation API and page', () => {
    const route = readFileSync(new URL('../../app/api/admin/organisation/route.ts', import.meta.url), 'utf8')
    const page = readFileSync(new URL('../../app/admin/organisation/page.tsx', import.meta.url), 'utf8')
    expect(route).toContain("authorizeAdminRequest('settings.view')")
    expect(route).toContain("authorizeAdminRequest('settings.update')")
    expect(page).toContain("requirePermission('settings.view')")
    expect(hasPermission(UserRole.ADMIN, 'settings.update')).toBe(true)
    expect(hasPermission(UserRole.SALES, 'settings.update')).toBe(false)
  })
})
