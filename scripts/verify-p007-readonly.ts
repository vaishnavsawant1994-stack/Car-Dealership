import 'dotenv/config'
import { Pool } from 'pg'
import { assertRuntimeDatabaseUrl, getCarDealershipEnvironment } from '../lib/config/isolation'
import { assertHostedIdentity, assertRestrictedAppRole, type AppRoleRow, type IdentityRow } from '../lib/config/environment-attestation'

/**
 * P0-07 manual, read-only security attestation. No migrations, mutation,
 * account activation, backup or restore. Never prints credentials.
 */
async function main() {
  const environment = getCarDealershipEnvironment()
  if (environment !== 'staging' && environment !== 'demo') {
    throw new Error('Security attestation only permits staging or demo.')
  }
  if (process.env.APP_PROJECT_ID !== 'car-dealership') throw new Error('Wrong project marker.')
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('Missing restricted runtime DATABASE_URL.')
  assertRuntimeDatabaseUrl(connectionString)

  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 10000 })
  const client = await pool.connect()
  try {
    await client.query('BEGIN READ ONLY')
    try {
      const identities = await client.query<IdentityRow>(
        'SELECT application, environment, "instanceId"::text AS "instanceId" FROM "CarDealershipEnvironment" WHERE id=$1',
        ['primary'],
      )
      if (identities.rows.length !== 1) throw new Error('Missing database identity.')
      assertHostedIdentity(identities.rows[0], environment, process.env.EXPECTED_DATABASE_ID)

      const roleSql = [
        "SELECT current_user AS \"role\", r.rolcanlogin AS \"canLogin\", r.rolsuper AS \"isSuperuser\",",
        "r.rolcreaterole AS \"canCreateRoles\", r.rolcreatedb AS \"canCreateDatabases\",",
        "r.rolinherit AS \"inheritsRoles\",",
        "(SELECT count(*)::int FROM pg_auth_members m WHERE m.member=r.oid) AS memberships,",
        "has_schema_privilege(current_user, 'public', 'CREATE') AS \"canCreateSchema\",",
        "has_table_privilege(current_user, '\"CarDealershipEnvironment\"', 'UPDATE') AS \"canWriteIdentity\",",
        "has_table_privilege(current_user, '\"_prisma_migrations\"', 'INSERT') AS \"canWriteMigrations\",",
        "has_table_privilege(current_user, '\"Vehicle\"', 'SELECT') AS \"canReadVehicles\",",
        "has_table_privilege(current_user, '\"AuditLog\"', 'INSERT') AS \"canInsertAuditLog\",",
        "has_table_privilege(current_user, '\"AuditLog\"', 'UPDATE') AS \"canUpdateAuditLog\",",
        "has_table_privilege(current_user, '\"AuditLog\"', 'DELETE') AS \"canDeleteAuditLog\"",
        "FROM pg_roles r WHERE r.rolname = current_user",
      ].join(' ')
      const roles = await client.query<AppRoleRow>(roleSql)
      if (roles.rows.length !== 1) throw new Error('Unable to verify application role.')
      assertRestrictedAppRole(roles.rows[0], environment)

      const counts = await client.query<{ vehicles: number; realUsers: number }>(
        "SELECT (SELECT count(*)::int FROM \"Vehicle\") AS vehicles, " +
        "(SELECT count(*)::int FROM \"User\" WHERE lower(email) NOT LIKE '%@car-dealership.test') AS \"realUsers\"",
      )
      if (counts.rows[0]?.realUsers !== 0) throw new Error('Real identities are not approved for hosted demos.')
      await client.query('COMMIT')
      console.info('P0-07 READ-ONLY PASS', {
        environment,
        role: roles.rows[0].role,
        syntheticVehicles: counts.rows[0].vehicles,
      })
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined)
      throw error
    }
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((error) => {
  console.error('P0-07 read-only verification FAILED: ' +
    (error instanceof Error ? error.message.replace(/postgres(?:ql)?:\/\/\S+/gi, '[redacted]') : 'Unknown error'))
  process.exitCode = 1
})
