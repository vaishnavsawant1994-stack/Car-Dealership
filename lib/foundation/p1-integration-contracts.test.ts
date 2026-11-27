import { randomBytes } from 'node:crypto'
import { UserRole } from '@prisma/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { hasPermission } from '@/lib/auth/admin-permissions'
import { canAccessAssignedResource, canManageUser, mayViewPrivateDocuments } from '@/lib/auth/admin-resource-policy'
import { assertAllowedDatabaseUrl } from '@/lib/config/isolation'
import { buildVehicleWhatsAppUrl, buildWhatsAppUrl } from '@/lib/constants/business'
import { openEmail, readCaptureKey, sealEmail } from '@/lib/email/capture-crypto'
import { sanitizeAuditMetadata } from '@/lib/admin/audit-sanitize'
import { assertDemoEmail, canUseSelfRegistration, isDemoEmail } from '@/lib/security/demo-access'

afterEach(() => vi.unstubAllEnvs())

describe('P1-10 integrated foundation isolation contracts', () => {
  it('keeps hosted identity and public registration limited to fictional data', () => {
    for (const environment of ['staging', 'demo', 'preview']) {
      expect(canUseSelfRegistration(environment)).toBe(false)
      expect(() => assertDemoEmail('real.user@example.com', environment)).toThrow()
      expect(() => assertDemoEmail('demo.sales@car-dealership.test', environment)).not.toThrow()
    }
    expect(isDemoEmail('unknown@example.com')).toBe(false)
    expect(canUseSelfRegistration('local')).toBe(true)
    expect(canUseSelfRegistration('commercial')).toBe(false)
  })

  it('prevents database target crossover in approved staging configuration', () => {
    vi.stubEnv('APP_ENV', 'staging')
    vi.stubEnv('APP_PROJECT_ID', 'car-dealership')
    vi.stubEnv('EXPECTED_DATABASE_HOST', 'synthetic-staging.neon.example')
    vi.stubEnv('EXPECTED_DATABASE_NAME', 'car_dealership_staging')
    const staging = 'postgresql://synthetic@synthetic-staging.neon.example/car_dealership_staging'
    expect(() => assertAllowedDatabaseUrl(staging, 'integration contract')).not.toThrow()
    expect(() => assertAllowedDatabaseUrl('postgresql://synthetic@localhost/car_dealership_staging', 'integration contract')).toThrow()
    expect(() => assertAllowedDatabaseUrl('postgresql://synthetic@synthetic-staging.neon.example/car_dealership_demo', 'integration contract')).toThrow()
    expect(() => assertAllowedDatabaseUrl('postgresql://synthetic@optimus.example/car_dealership_staging', 'integration contract')).toThrow()
  })

  it('honors staff permission restrictions and protected-account boundaries', () => {
    expect(hasPermission(UserRole.CUSTOMER, 'dashboard.view')).toBe(false)
    expect(hasPermission(UserRole.SALES, 'vehicle.publish')).toBe(false)
    expect(hasPermission(UserRole.CONTENT_MANAGER, 'user.role.manage')).toBe(false)
    expect(hasPermission(UserRole.ADMIN, 'user.role.manage')).toBe(false)
    expect(hasPermission(UserRole.SUPER_ADMIN, 'user.role.manage')).toBe(true)

    const sales = { id: 'sales-a', role: UserRole.SALES }
    expect(canAccessAssignedResource(sales, { assignedToId: 'sales-b' })).toBe(false)
    expect(canAccessAssignedResource(sales, { assignedToId: 'sales-a' })).toBe(true)
    expect(canManageUser({ id: 'admin-a', role: UserRole.ADMIN }, { id: 'super-a', role: UserRole.SUPER_ADMIN })).toBe(false)
    expect(mayViewPrivateDocuments(UserRole.SALES)).toBe(false)
    expect(mayViewPrivateDocuments(UserRole.CONTENT_MANAGER)).toBe(false)
    expect(mayViewPrivateDocuments(UserRole.OPERATIONS)).toBe(true)
  })

  it('keeps communication links internal until release approval', () => {
    expect(buildWhatsAppUrl('hello', '9999999999')).toBe('/contact')
    expect(buildVehicleWhatsAppUrl({ year: 2026, make: 'Fictional', model: 'Sedan' })).toBe('/contact')
  })

  it('encrypts captured email with an environment-bound authenticated payload', () => {
    const key = readCaptureKey(randomBytes(32).toString('base64url'))
    const fakeEmail = { to: 'fictional@car-dealership.test', subject: 'Synthetic alert', html: '<p>Test</p>' }
    const sealed = sealEmail(fakeEmail, key, 'staging')
    expect(JSON.stringify(sealed)).not.toContain(fakeEmail.to)
    expect(openEmail(sealed, key, 'staging')).toEqual(fakeEmail)
    expect(() => openEmail(sealed, key, 'demo')).toThrow()
    expect(() => openEmail({ ...sealed, authTag: randomBytes(16).toString('base64url') }, key, 'staging')).toThrow()
    expect(() => openEmail(sealed, randomBytes(32), 'staging')).toThrow()
  })

  it('sanitizes nested secret-like audit metadata', () => {
    const clean = sanitizeAuditMetadata({
      action: 'FICTIONAL',
      password: 'synthetic',
      nested: { authorization: 'synthetic', apiToken: 'synthetic', safe: 1 },
      values: [{ secret: 'synthetic', allowed: 'yes' }],
    })
    expect(clean).toEqual({ action: 'FICTIONAL', nested: { safe: 1 }, values: [{ allowed: 'yes' }] })
  })
})
