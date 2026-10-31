import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { assertAllowedDatabaseUrl, getCarDealershipEnvironment } from './isolation'

const keys = ['APP_ENV', 'APP_PROJECT_ID', 'EXPECTED_DATABASE_HOST', 'EXPECTED_DATABASE_NAME', 'CI', 'NODE_ENV'] as const
const original = Object.fromEntries(keys.map((key) => [key, process.env[key]])) as Record<typeof keys[number], string | undefined>

beforeEach(() => {
  process.env.APP_ENV = 'local'
  (process.env as Record<string, string | undefined>).NODE_ENV = 'test'
  delete process.env.CI
  delete process.env.APP_PROJECT_ID
  delete process.env.EXPECTED_DATABASE_HOST
  delete process.env.EXPECTED_DATABASE_NAME
})

afterEach(() => {
  for (const key of keys) {
    if (original[key] === undefined) delete process.env[key]
    else (process.env as Record<string, string | undefined>)[key] = original[key]
  }
})

describe('Car-Dealership database isolation preflight', () => {
  const local = 'postgresql://dev:secret@localhost:5436/car_dealership_dev?schema=public'
  it('allows only designated standalone local databases in local mode', () => {
    expect(() => assertAllowedDatabaseUrl(local, 'unit')).not.toThrow()
    expect(() => assertAllowedDatabaseUrl('postgresql://dev:secret@127.0.0.1:5436/car_dealership_test', 'unit')).not.toThrow()
    expect(() => assertAllowedDatabaseUrl('postgresql://dev:secret@localhost:5432/other_database', 'unit')).toThrow()
  })
  it('rejects original-project-style names and unapproved remote databases', () => {
    expect(() => assertAllowedDatabaseUrl('postgresql://dev:secret@localhost:5432/deccan_wheels', 'unit')).toThrow()
    expect(() => assertAllowedDatabaseUrl('postgresql://dev:secret@neon.example/car_dealership_demo', 'unit')).toThrow()
    expect(() => assertAllowedDatabaseUrl('postgresql://dev:secret@optimum-postgres.example/car_dealership_dev', 'unit')).toThrow()
  })
  it('requires exact project, hostname and database name for a remote demo', () => {
    process.env.APP_ENV = 'demo'
    expect(() => assertAllowedDatabaseUrl('postgresql://u:p@demo-db.example/car_dealership_demo', 'unit')).toThrow()
    process.env.APP_PROJECT_ID = 'car-dealership'
    process.env.EXPECTED_DATABASE_HOST = 'demo-db.example'
    process.env.EXPECTED_DATABASE_NAME = 'car_dealership_demo'
    expect(() => assertAllowedDatabaseUrl('postgresql://u:p@demo-db.example/car_dealership_demo', 'unit')).not.toThrow()
    expect(() => assertAllowedDatabaseUrl('postgresql://u:p@other-db.example/car_dealership_demo', 'unit')).toThrow()
    expect(() => assertAllowedDatabaseUrl('postgresql://u:p@demo-db.example/car_dealership_staging', 'unit')).toThrow()
  })
  it('blocks wrong project identity and commercial connections', () => {
    process.env.APP_PROJECT_ID = 'optimus-automobiles'
    expect(() => assertAllowedDatabaseUrl(local, 'unit')).toThrow()
    process.env.APP_PROJECT_ID = 'car-dealership'
    process.env.APP_ENV = 'commercial'
    expect(() => assertAllowedDatabaseUrl(local, 'unit')).toThrow()
  })
  it('requires an explicit APP_ENV in production', () => {
    delete process.env.APP_ENV
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production'
    expect(() => getCarDealershipEnvironment()).toThrow()
  })
  it('keeps the historical CI fixture allowance only inside isolated CI tests', () => {
    process.env.APP_ENV = 'test'
    process.env.CI = 'true'
    expect(() => assertAllowedDatabaseUrl('postgresql://postgres:postgres@localhost:5432/deccan_wheels', 'ci')).not.toThrow()
    process.env.CI = 'false'
    expect(() => assertAllowedDatabaseUrl('postgresql://postgres:postgres@localhost:5432/deccan_wheels', 'unit')).toThrow()
  })
})
