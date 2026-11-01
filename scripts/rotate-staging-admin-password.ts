import 'dotenv/config'
import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import { hashPassword } from '../lib/auth/password'
import { assertAllowedDatabaseUrl, getCarDealershipEnvironment } from '../lib/config/isolation'
import { assertStagingAdminRecovery, assertStagingAdminRecoveryApproval, readMaskedStagingAdminPassword, STAGING_ADMIN_EMAIL } from '../lib/security/staging-admin-recovery'

/**
 * Emergency fictional staging-only credential rotation.
 *
 * Execute only in a disposable maintenance process with an approved,
 * privately entered password. Never set recovery secrets in a Vercel
 * deployment, GitHub Actions, repository file, command argument or log.
 */
async function main() {
  const environment = getCarDealershipEnvironment()
  const directUrl = process.env.DIRECT_URL
  const expectedDatabaseId = process.env.EXPECTED_DATABASE_ID
  if (process.env.P006_STAGING_NEW_PASSWORD !== undefined) {
    throw new Error('Do not provide the recovery password through an environment variable.')
  }

  assertStagingAdminRecoveryApproval({
    environment,
    projectId: process.env.APP_PROJECT_ID,
    approved: process.env.P006_STAGING_RESET_APPROVED,
    email: process.env.P006_STAGING_RESET_EMAIL,
    expectedDatabaseId,
    directUrl,
  })
  assertAllowedDatabaseUrl(directUrl!, 'staging administrator password recovery')
  let password = await readMaskedStagingAdminPassword(process.stdin, process.stdout)
  assertStagingAdminRecovery({
    environment,
    projectId: process.env.APP_PROJECT_ID,
    approved: process.env.P006_STAGING_RESET_APPROVED,
    email: process.env.P006_STAGING_RESET_EMAIL,
    password,
    expectedDatabaseId,
    directUrl,
  })
  const passwordHash = await hashPassword(password)
  password = ''
  const pool = new Pool({ connectionString: directUrl, max: 1, connectionTimeoutMillis: 10_000 })
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const identity = await client.query(
      'SELECT "instanceId", environment FROM "CarDealershipEnvironment" WHERE id=$1 FOR SHARE',
      ['primary'],
    )
    if (identity.rowCount !== 1 || identity.rows[0].environment !== 'staging' ||
        identity.rows[0].instanceId !== expectedDatabaseId) {
      throw new Error('Staging database identity mismatch; no credential changed.')
    }
    const account = await client.query(
      'SELECT id, role, status, "emailVerified", "passwordHash" FROM "User" WHERE email=$1 AND "deletedAt" IS NULL FOR UPDATE',
      [STAGING_ADMIN_EMAIL],
    )
    if (account.rowCount !== 1 || account.rows[0].role !== 'SUPER_ADMIN' ||
        account.rows[0].status !== 'ACTIVE' || !account.rows[0].emailVerified ||
        !account.rows[0].passwordHash) {
      throw new Error('The expected active, previously provisioned administrator was not found.')
    }

    const userId = account.rows[0].id as string
    await client.query(
      'UPDATE "User" SET "passwordHash"=$1, "sessionVersion"="sessionVersion"+1, "updatedAt"=now() WHERE id=$2',
      [passwordHash, userId],
    )
    await client.query('DELETE FROM "Session" WHERE "userId"=$1', [userId])
    await client.query(
      'UPDATE "PasswordResetToken" SET "usedAt"=now() WHERE "userId"=$1 AND "usedAt" IS NULL',
      [userId],
    )
    await client.query(
      'INSERT INTO "AuditLog" (id,"actorId",action,entity,"entityId",summary) VALUES ($1,$2,$3,$4,$5,$6)',
      [randomUUID(), userId, 'DEMO_ADMIN_PASSWORD_ROTATED', 'User', userId,
        'Authorized fictional staging administrator credential rotated; sessions revoked.'],
    )
    await client.query('COMMIT')
    console.info('Staging demo admin credential rotated and sessions invalidated (password not logged).')
  } catch {
    await client.query('ROLLBACK')
    // Do not log driver exceptions: they may include environment or connection data.
    throw new Error('Staging admin credential rotation failed and was rolled back.')
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch(() => {
  console.error('Staging admin recovery was refused or rolled back; no secrets were printed.')
  process.exitCode = 1
})
