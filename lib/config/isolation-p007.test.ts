import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { assertAllowedDatabaseUrl } from './isolation'
import { assertHostedIdentity, assertRestrictedAppRole, type AppRoleRow } from './environment-attestation'

const keys = ['APP_ENV', 'APP_PROJECT_ID', 'EXPECTED_DATABASE_HOST', 'EXPECTED_DATABASE_NAME'] as const
const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]])) as Record<string, string | undefined>
const host = 'isolated-test-pooler.aws.neon.tech'
const stagingId = 'e0a5faff-8c8a-4955-b70e-f5c1c17c38eb'
const stagingRow = { application: 'car-dealership', environment: 'staging', instanceId: stagingId }
const safeRole: AppRoleRow = {
  role: 'cd_staging_app',
  canLogin: true,
  isSuperuser: false,
  canCreateRoles: false,
  canCreateDatabases: false,
  inheritsRoles: false,
  memberships: 0,
  canCreateSchema: false,
  canWriteIdentity: false,
  canWriteMigrations: false,
  canReadVehicles: true,
}
const uri = (name: string) => 'postgresql://tester:test@' + host + '/' + name

beforeEach(() => {
  process.env.APP_ENV = 'staging'
  process.env.APP_PROJECT_ID = 'car-dealership'
  process.env.EXPECTED_DATABASE_HOST = host
  process.env.EXPECTED_DATABASE_NAME = 'car_dealership_staging'
})
afterEach(() => {
  for (const key of keys) {
    if (previous[key] === undefined) delete process.env[key]
    else process.env[key] = previous[key]
  }
})

describe('P0-07 isolation and fault-injection regression gates', () => {
  it('permits only the nominated staging database', () => {
    expect(() => assertAllowedDatabaseUrl(uri('car_dealership_staging'), 'security test')).not.toThrow()
    expect(() => assertAllowedDatabaseUrl('postgresql://tester:test@evil.example/car_dealership_staging', 'security test')).toThrow()
  })
  it('rejects staged connections to demo even when expected name is maliciously changed', () => {
    process.env.EXPECTED_DATABASE_NAME = 'car_dealership_demo'
    expect(() => assertAllowedDatabaseUrl(uri('car_dealership_demo'), 'security test')).toThrow()
  })
  it('rejects demo connections to staging even when expected name is maliciously changed', () => {
    process.env.APP_ENV = 'demo'
    expect(() => assertAllowedDatabaseUrl(uri('car_dealership_staging'), 'security test')).toThrow()
  })
  it('permits the separately approved demo database', () => {
    process.env.APP_ENV = 'demo'
    process.env.EXPECTED_DATABASE_NAME = 'car_dealership_demo'
    expect(() => assertAllowedDatabaseUrl(uri('car_dealership_demo'), 'security test')).not.toThrow()
    expect(() => assertAllowedDatabaseUrl(uri('car_dealership_staging'), 'security test')).toThrow()
  })
  it('requires an exact application, environment, and fingerprint', () => {
    expect(() => assertHostedIdentity(stagingRow, 'staging', stagingId)).not.toThrow()
    expect(() => assertHostedIdentity(stagingRow, 'demo', stagingId)).toThrow()
    expect(() => assertHostedIdentity(undefined, 'staging', stagingId)).toThrow()
    expect(() => assertHostedIdentity(stagingRow, 'staging', undefined)).toThrow()
    expect(() => assertHostedIdentity(stagingRow, 'staging', 'garbage')).toThrow()
    expect(() => assertHostedIdentity(stagingRow, 'staging', '37edbbfe-3ed1-4f34-9d75-a7a13ec05720')).toThrow()
    expect(() => assertHostedIdentity({ ...stagingRow, application: 'another-product' }, 'staging', stagingId)).toThrow()
  })
  it('denies privileged, inheriting, migration-writing, and mismatched runtime roles', () => {
    expect(() => assertRestrictedAppRole(safeRole, 'staging')).not.toThrow()
    for (const changed of [
      { role: 'cd_staging_owner' }, { canLogin: false }, { isSuperuser: true },
      { canCreateRoles: true }, { canCreateDatabases: true }, { inheritsRoles: true },
      { memberships: 1 }, { canCreateSchema: true }, { canWriteIdentity: true },
      { canWriteMigrations: true }, { canReadVehicles: false },
    ]) {
      expect(() => assertRestrictedAppRole({ ...safeRole, ...changed }, 'staging')).toThrow()
    }
    expect(() => assertRestrictedAppRole(safeRole, 'demo')).toThrow()
    expect(() => assertRestrictedAppRole({ ...safeRole, role: 'cd_demo_app' }, 'demo')).not.toThrow()
  })
})
