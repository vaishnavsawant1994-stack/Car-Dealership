import 'dotenv/config'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { Pool } from 'pg'
import { assertAllowedDatabaseUrl, getCarDealershipEnvironment } from '../lib/config/isolation'

async function seed() {
  const env = getCarDealershipEnvironment()
  if (!['staging', 'demo'].includes(env) || process.env.APP_PROJECT_ID !== 'car-dealership') {
    throw new Error('Only approved Car-Dealership staging/demo environments may be seeded.')
  }
  const url = process.env.DIRECT_URL
  const expected = process.env.EXPECTED_DATABASE_ID
  if (!url || !expected) throw new Error('DIRECT_URL and EXPECTED_DATABASE_ID are required.')
  assertAllowedDatabaseUrl(url, 'hosted seed')
  const pool = new Pool({ connectionString: url, max: 1 })
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const identity = await client.query<{application:string;environment:string;instanceId:string}>(
      'SELECT "application","environment","instanceId" FROM "CarDealershipEnvironment" WHERE id=$1 FOR SHARE',
      ['primary'],
    )
    if (identity.rowCount !== 1 || identity.rows[0].application !== 'car-dealership' ||
        identity.rows[0].environment !== env || identity.rows[0].instanceId !== expected) {
      throw new Error('Database fingerprint mismatch. Seed refused.')
    }
    await client.query(readFileSync(path.join(process.cwd(), 'prisma', 'demo-seed.sql'), 'utf8'))
    await client.query('COMMIT')
    console.info('Car-Dealership fictional fixtures verified for', env)
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}
seed().catch(error => { console.error(error instanceof Error ? error.message : 'Demo seed failed'); process.exitCode = 1 })
