import 'dotenv/config'
import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import { hashPassword, passwordSchema } from '../lib/auth/password'
import { assertAllowedDatabaseUrl, getCarDealershipEnvironment } from '../lib/config/isolation'
import { demoAccountFixtureRoles } from '../lib/security/demo-access'

async function main() {
  const env = getCarDealershipEnvironment()
  if (!['staging', 'demo'].includes(env)) throw new Error('Only the isolated staging/demo database can provision demo logins.')
  if (process.env.APP_PROJECT_ID !== 'car-dealership' || process.env.DEMO_BOOTSTRAP_APPROVED !== 'true') {
    throw new Error('Explicit demo-account provisioning approval and project identity are required.')
  }
  const email = (process.env.DEMO_BOOTSTRAP_EMAIL || '').trim().toLowerCase()
  const role = demoAccountFixtureRoles[email as keyof typeof demoAccountFixtureRoles]
  if (!role) throw new Error('Email is not a pre-approved fictional demo fixture.')
  const password = process.env.DEMO_BOOTSTRAP_PASSWORD
  if (!password || password.length < 20 || !passwordSchema.safeParse(password).success) {
    throw new Error('A unique password of 20+ characters meeting the password policy is required.')
  }
  const url = process.env.DIRECT_URL
  const instance = process.env.EXPECTED_DATABASE_ID
  if (!url || !instance) throw new Error('DIRECT_URL and EXPECTED_DATABASE_ID are required.')
  assertAllowedDatabaseUrl(url, 'approved demo account provisioning')
  const hash = await hashPassword(password)
  const pool = new Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 10000 })
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const identity = await client.query(
      'SELECT "instanceId", environment FROM "CarDealershipEnvironment" WHERE id=$1 FOR SHARE',
      ['primary'],
    )
    if (identity.rowCount !== 1 || identity.rows[0].environment !== env || identity.rows[0].instanceId !== instance) {
      throw new Error('Demo database identity mismatch; account provisioning refused.')
    }
    const fixture = await client.query(
      'SELECT id, role, status, "passwordHash", "emailVerified" FROM "User" WHERE email=$1 FOR UPDATE',
      [email],
    )
    if (fixture.rowCount !== 1 || fixture.rows[0].role !== role || fixture.rows[0].passwordHash ||
        fixture.rows[0].emailVerified || (fixture.rows[0].status !== 'DISABLED' && fixture.rows[0].status !== 'ACTIVE')) {
      throw new Error('Fixture absent, already activated, or unexpected role/state; refused.')
    }
    await client.query(
      'UPDATE "User" SET "passwordHash"=$1, "emailVerified"=now(), status=$2, "sessionVersion"="sessionVersion"+1, "updatedAt"=now() WHERE id=$3',
      [hash, 'ACTIVE', fixture.rows[0].id],
    )
    await client.query(
      'INSERT INTO "AuditLog" (id,"actorId",action,entity,"entityId",summary) VALUES ($1,$2,$3,$4,$5,$6)',
      [randomUUID(), fixture.rows[0].id, 'DEMO_ACCOUNT_PROVISIONED', 'User', fixture.rows[0].id, 'One-time fictional demo account activated.'],
    )
    await client.query('COMMIT')
    console.info('Approved fictional demo account activated.', { environment: env, role })
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'Demo provisioning failed.')
  process.exitCode = 1
})
