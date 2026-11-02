import 'dotenv/config'
import { randomUUID } from 'node:crypto'
import { Pool, type PoolClient } from 'pg'
import { hashPassword } from '../lib/auth/password'
import { assertAllowedDatabaseUrl, getCarDealershipEnvironment } from '../lib/config/isolation'
import { assertStagingAdminPasswordIsNew, assertStagingAdminRecovery, assertStagingAdminRecoveryApproval, assertStagingAdminRecoveryConnection, assertStagingAdminRecoveryDatabaseRole, assertStagingAdminRecoveryInstanceId, readMaskedStagingAdminPassword, STAGING_ADMIN_EMAIL } from '../lib/security/staging-admin-recovery'

async function verifyRecoveryRole(client: PoolClient) {
  const role = await client.query(
    `SELECT current_user AS "roleName", r.rolsuper AS "superuser", r.rolcreatedb AS "createDb",
      r.rolcreaterole AS "createRole", r.rolbypassrls AS "bypassRls", r.rolinherit AS "inherit",
      (SELECT count(*)::int FROM pg_auth_members WHERE member=r.oid) AS memberships,
      has_table_privilege(current_user, 'public."CarDealershipEnvironment"', 'SELECT') AS "identityRead",
      has_table_privilege(current_user, 'public."User"', 'SELECT') AS "userRead",
      has_table_privilege(current_user, 'public."User"', 'UPDATE') AS "userUpdate",
      has_table_privilege(current_user, 'public."Session"', 'DELETE') AS "sessionDelete",
      has_table_privilege(current_user, 'public."PasswordResetToken"', 'UPDATE') AS "resetTokenUpdate",
      has_table_privilege(current_user, 'public."AuditLog"', 'INSERT') AS "auditInsert",
      has_table_privilege(current_user, 'public."AuditLog"', 'UPDATE') AS "auditUpdate",
      has_table_privilege(current_user, 'public."AuditLog"', 'DELETE') AS "auditDelete"
    FROM pg_roles r WHERE r.rolname=current_user`,
  )
  if (role.rowCount !== 1) throw new Error('Recovery database role could not be verified.')
  assertStagingAdminRecoveryDatabaseRole(role.rows[0])
}

async function verifyRecoveryTarget(client: PoolClient, expectedDatabaseId: string, lock: boolean) {
  await verifyRecoveryRole(client)
  const identity = await client.query(
    `SELECT "instanceId", environment FROM public."CarDealershipEnvironment" WHERE id=$1${lock ? ' FOR SHARE' : ''}`,
    ['primary'],
  )
  if (identity.rowCount !== 1 || identity.rows[0].environment !== 'staging' ||
      identity.rows[0].instanceId !== expectedDatabaseId) {
    throw new Error('Staging database identity mismatch; no credential changed.')
  }
  const account = await client.query(
    `SELECT id, role, status, "emailVerified"${lock ? ', "passwordHash"' : ', ("passwordHash" IS NOT NULL) AS "passwordPresent"'}
      FROM public."User" WHERE email=$1 AND "deletedAt" IS NULL${lock ? ' FOR UPDATE' : ''}`,
    [STAGING_ADMIN_EMAIL],
  )
  if (account.rowCount !== 1 || account.rows[0].role !== 'SUPER_ADMIN' ||
      account.rows[0].status !== 'ACTIVE' || !account.rows[0].emailVerified ||
      !(lock ? account.rows[0].passwordHash : account.rows[0].passwordPresent)) {
    throw new Error('The expected active, previously provisioned administrator was not found.')
  }
  return account.rows[0]
}

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
  assertStagingAdminRecoveryInstanceId(expectedDatabaseId)
  assertAllowedDatabaseUrl(directUrl!, 'staging administrator password recovery')
  assertStagingAdminRecoveryConnection(directUrl!)
  let password = ''
  let passwordHash = ''
  try {
    const preflightPool = new Pool({ connectionString: directUrl, max: 1, connectionTimeoutMillis: 10_000 })
    try {
      const preflightClient = await preflightPool.connect()
      try {
        await preflightClient.query('BEGIN READ ONLY')
        await verifyRecoveryTarget(preflightClient, expectedDatabaseId!, false)
        await preflightClient.query('COMMIT')
      } catch {
        try { await preflightClient.query('ROLLBACK') } catch { /* avoid logging connection details */ }
        throw new Error('Recovery target preflight failed; no credential was collected or changed.')
      } finally {
        preflightClient.release()
      }
    } finally {
      await preflightPool.end()
    }

    password = await readMaskedStagingAdminPassword(process.stdin, process.stdout)
    assertStagingAdminRecovery({
      environment,
      projectId: process.env.APP_PROJECT_ID,
      approved: process.env.P006_STAGING_RESET_APPROVED,
      email: process.env.P006_STAGING_RESET_EMAIL,
      password,
      expectedDatabaseId,
      directUrl,
    })
    passwordHash = await hashPassword(password)

    const pool = new Pool({ connectionString: directUrl, max: 1, connectionTimeoutMillis: 10_000 })
    try {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        const account = await verifyRecoveryTarget(client, expectedDatabaseId!, true)
        await assertStagingAdminPasswordIsNew(password, account.passwordHash as string)
        password = ''

        const userId = account.id as string
        await client.query(
          'UPDATE public."User" SET "passwordHash"=$1, "sessionVersion"="sessionVersion"+1, "updatedAt"=now() WHERE id=$2',
          [passwordHash, userId],
        )
        await client.query('DELETE FROM public."Session" WHERE "userId"=$1', [userId])
        await client.query(
          'UPDATE public."PasswordResetToken" SET "usedAt"=now() WHERE "userId"=$1 AND "usedAt" IS NULL',
          [userId],
        )
        await client.query(
          'INSERT INTO public."AuditLog" (id,"actorId",action,entity,"entityId",summary) VALUES ($1,$2,$3,$4,$5,$6)',
          [randomUUID(), userId, 'DEMO_ADMIN_PASSWORD_ROTATED', 'User', userId,
            'Authorized fictional staging administrator credential rotated; sessions revoked.'],
        )
        await client.query('COMMIT')
        console.info('Staging demo admin credential rotated and sessions invalidated (password not logged).')
      } catch {
        try { await client.query('ROLLBACK') } catch { /* avoid logging connection details */ }
        throw new Error('Staging admin credential rotation failed and was rolled back.')
      } finally {
        client.release()
      }
    } finally {
      await pool.end()
    }
  } finally {
    password = ''
    passwordHash = ''
  }
}

main().catch(() => {
  console.error('Staging admin recovery was refused or rolled back; no secrets were printed.')
  process.exitCode = 1
})
