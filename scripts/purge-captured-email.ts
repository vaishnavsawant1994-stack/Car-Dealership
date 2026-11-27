import 'dotenv/config'
import { Pool } from 'pg'
import { assertAllowedDatabaseUrl, getCarDealershipEnvironment } from '../lib/config/isolation'
import { logSafeError } from '../lib/observability/safe-log'

/** Explicitly scheduled by deployment operations; never runs in a web build. */
async function main() {
  const environment = getCarDealershipEnvironment()
  if (!['staging', 'demo'].includes(environment) || process.env.APP_PROJECT_ID !== 'car-dealership') {
    throw new Error('Email retention cleanup is limited to isolated hosted demonstrations.')
  }
  const expected = process.env.EXPECTED_DATABASE_ID
  const url = process.env.DIRECT_URL
  if (!url || !expected) throw new Error('DIRECT_URL and EXPECTED_DATABASE_ID are required.')
  assertAllowedDatabaseUrl(url, 'expired captured email cleanup')
  const pool = new Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 10000 })
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await client.query(
      'SELECT environment, "instanceId" FROM "CarDealershipEnvironment" WHERE id=$1 FOR SHARE',
      ['primary'],
    )
    if (result.rowCount !== 1 || result.rows[0].environment !== environment || result.rows[0].instanceId !== expected) {
      throw new Error('Database identity mismatch: email retention cleanup refused.')
    }
    const removed = await client.query('DELETE FROM "CapturedEmail" WHERE environment=$1 AND "expiresAt" < now()', [environment])
    await client.query('COMMIT')
    console.info('Expired demo email captures removed.', { environment, count: removed.rowCount })
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch(error => {
  logSafeError('captured_email_retention_cleanup_failed', error)
  process.exitCode = 1
})
