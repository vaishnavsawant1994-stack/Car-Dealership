import { describe, expect, it } from 'vitest'
import { assertStagingAdminRecovery, STAGING_ADMIN_EMAIL } from './staging-admin-recovery'

const approved = {
  environment: 'staging',
  projectId: 'car-dealership',
  approved: 'true',
  email: STAGING_ADMIN_EMAIL,
  password: 'SyntheticOnlySecure!2026-Stage',
  directUrl: 'postgresql://test@localhost/car_dealership_staging',
  expectedDatabaseId: 'synthetic-fixture-identity',
}

describe('P0-06 staging-only password recovery preflight', () => {
  it('allows only a fully approved staging admin recovery request', () => {
    expect(() => assertStagingAdminRecovery(approved)).not.toThrow()
  })
  it.each([
    { environment: 'demo' },
    { environment: 'commercial' },
    { environment: 'test' },
    { projectId: 'other-project' },
    { approved: 'false' },
    { email: 'demo.manager@car-dealership.test' },
    { email: 'customer@example.com' },
    { password: 'short' },
    { password: 'alllowercaseandnothingelse' },
    { password: '' },
    { expectedDatabaseId: '' },
    { directUrl: '' },
  ])('fails closed for invalid input %o', (invalid) => {
    expect(() => assertStagingAdminRecovery({ ...approved, ...invalid })).toThrow()
  })
})
