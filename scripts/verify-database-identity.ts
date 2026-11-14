import 'dotenv/config'
import { Pool } from 'pg'
import { assertAllowedDatabaseUrl, getCarDealershipEnvironment } from '../lib/config/isolation'
import { logSafeError } from '../lib/observability/safe-log'

/** Validate a Car-Dealership database identity before seeding or migrating. */
export async function verifyDatabaseIdentity(): Promise<void> {
  const env = getCarDealershipEnvironment()
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL
  if (!url) throw new Error('DIRECT_URL or DATABASE_URL is required.')
  assertAllowedDatabaseUrl(url, 'database identity check')
  if (env === 'commercial') throw new Error('Commercial database operations are not enabled.')
  const expected = process.env.EXPECTED_DATABASE_ID
  if (!expected) throw new Error('EXPECTED_DATABASE_ID must be configured for verified database operations.')
  const pool = new Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 10000 })
  try {
    const row = await pool.query<{ application: string; environment: string; instanceId: string }>(
      'SELECT "application", "environment", "instanceId" FROM "CarDealershipEnvironment" WHERE "id" = $1',
      ['primary'],
    )
    if (row.rows.length !== 1 ||
        row.rows[0].application !== 'car-dealership' ||
        row.rows[0].environment !== env ||
        row.rows[0].instanceId !== expected) {
      throw new Error('Database fingerprint mismatch: refusing an unapproved database.')
    }
    console.info('Car-Dealership database identity verified for', env)
  } finally {
    await pool.end()
  }
}

if (process.argv[1]?.includes('verify-database-identity')) {
  verifyDatabaseIdentity().catch((error) => {
    logSafeError('database_identity_verification_failed', error)
    process.exitCode = 1
  })
}
