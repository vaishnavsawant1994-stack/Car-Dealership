import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { assertAllowedDatabaseUrl, assertRuntimeDatabaseUrl } from './isolation'
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
  canInsertAuditLog: true,
  canUpdateAuditLog: false,
  canDeleteAuditLog: false,
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
      { canInsertAuditLog: false }, { canUpdateAuditLog: true }, { canDeleteAuditLog: true },
    ]) {
      expect(() => assertRestrictedAppRole({ ...safeRole, ...changed }, 'staging')).toThrow()
    }
    expect(() => assertRestrictedAppRole(safeRole, 'demo')).toThrow()
    expect(() => assertRestrictedAppRole({ ...safeRole, role: 'cd_demo_app' }, 'demo')).not.toThrow()
  })
})


describe('P0-07 hosted runtime login and database TLS isolation', () => {
  it('allows the restricted staging role with current TLS or explicit certificate verification', () => {
    for (const mode of ['require', 'verify-full']) {
      const url = 'postgresql://cd_staging_app:fictional@' + host + '/car_dealership_staging?sslmode=' + mode
      expect(() => assertRuntimeDatabaseUrl(url)).not.toThrow()
    }
  })

  it('denies the database owner, the other environment role, and missing role', () => {
    for (const role of ['cd_staging_owner', 'cd_demo_app', '']) {
      const url = 'postgresql://' + role + ':fictional@' + host + '/car_dealership_staging?sslmode=require'
      expect(() => assertRuntimeDatabaseUrl(url)).toThrow()
    }
  })

  it('denies insecure, missing, and ambiguous TLS configuration', () => {
    const base = 'postgresql://cd_staging_app:fictional@' + host + '/car_dealership_staging'
    for (const query of [
      '', '?sslmode=disable', '?sslmode=allow', '?sslmode=prefer', '?sslmode=verify-ca',
      '?sslmode=require&ssl=false', '?sslmode=require&uselibpqcompat=true',
    ]) {
      expect(() => assertRuntimeDatabaseUrl(base + query)).toThrow()
    }
  })

  it('requires the demo role for a separate hosted demo', () => {
    process.env.APP_ENV = 'demo'
    process.env.EXPECTED_DATABASE_NAME = 'car_dealership_demo'
    const base = 'postgresql://'
    const tail = '@' + host + '/car_dealership_demo?sslmode=verify-full'
    expect(() => assertRuntimeDatabaseUrl(base + 'cd_demo_app:fictional' + tail)).not.toThrow()
    expect(() => assertRuntimeDatabaseUrl(base + 'cd_staging_app:fictional' + tail)).toThrow()
  })

  it('keeps isolated local test databases available without hosted TLS or role requirements', () => {
    process.env.APP_ENV = 'test'
    delete process.env.EXPECTED_DATABASE_HOST
    delete process.env.EXPECTED_DATABASE_NAME
    expect(() => assertRuntimeDatabaseUrl('postgresql://postgres:postgres@localhost:5432/car_dealership_test')).not.toThrow()
    expect(() => assertRuntimeDatabaseUrl('postgresql://postgres:postgres@localhost:5432/other_db')).toThrow()
  })
})
