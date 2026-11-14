/**
 * Car-Dealership's P0-03 connection preflight.
 * Rejects the original project's database and requires exact target approval
 * before remote connections. This is defense-in-depth, not a substitute for IAM.
 */
export type CarDealershipEnvironment = 'local' | 'test' | 'preview' | 'staging' | 'demo' | 'commercial'

const localHosts = new Set(['localhost', '127.0.0.1', '::1'])
const allowedEnvironments = new Set<CarDealershipEnvironment>(['local', 'test', 'preview', 'staging', 'demo', 'commercial'])

export function getCarDealershipEnvironment(): CarDealershipEnvironment {
  const selected = process.env.APP_ENV || (process.env.NODE_ENV === 'test' ? 'test' : process.env.NODE_ENV === 'production' ? '' : 'local')
  if (!allowedEnvironments.has(selected as CarDealershipEnvironment)) {
    throw new Error('APP_ENV must explicitly select a Car-Dealership environment when running in production.')
  }
  return selected as CarDealershipEnvironment
}

export function assertAllowedDatabaseUrl(connectionString: string, purpose: string): void {
  if (process.env.APP_PROJECT_ID && process.env.APP_PROJECT_ID !== 'car-dealership') {
    throw new Error(`Invalid APP_PROJECT_ID for ${purpose}.`)
  }

  let address: URL
  try { address = new URL(connectionString) }
  catch { throw new Error(`Malformed database URL for ${purpose}.`) }

  if (!['postgresql:', 'postgres:'].includes(address.protocol)) {
    throw new Error(`Only PostgreSQL databases are allowed for ${purpose}.`)
  }
  const env = getCarDealershipEnvironment()
  const host = address.hostname.toLowerCase()
  const database = decodeURIComponent(address.pathname.slice(1))
  const local = localHosts.has(host)

  if (/optimum|optimus|deccan/i.test(host + '/' + database)) {
    throw new Error(`Car-Dealership refused a legacy source-looking database target for ${purpose}.`)
  }
  if (env === 'commercial') {
    throw new Error('Commercial database connections are disabled until an independently reviewed production launch.')
  }
  if (env === 'local' || env === 'test') {
    if (!local || !['car_dealership_dev', 'car_dealership_test'].includes(database)) {
      throw new Error(`Only isolated local/test databases are allowed for ${purpose}.`)
    }
  } else {
    if (local) throw new Error(`Remote ${env} environment cannot use a loopback database for ${purpose}.`)
    // P0-07: a changed EXPECTED_DATABASE_NAME must not permit staging/demo swaps.
    const dedicatedDatabase = env === 'staging' ? 'car_dealership_staging' : env === 'demo' ? 'car_dealership_demo' : null
    if (dedicatedDatabase && (database !== dedicatedDatabase || process.env.EXPECTED_DATABASE_NAME !== dedicatedDatabase)) {
      throw new Error('Car-Dealership environment/database isolation mismatch for ' + purpose + '.')
    }
    if (!process.env.EXPECTED_DATABASE_HOST || !process.env.EXPECTED_DATABASE_NAME || !process.env.APP_PROJECT_ID) {
      throw new Error(`Explicit Car-Dealership remote database approval is required for ${purpose}.`)
    }
  }

  if (process.env.EXPECTED_DATABASE_HOST && process.env.EXPECTED_DATABASE_HOST.toLowerCase() !== host) {
    throw new Error(`Database host does not match approved Car-Dealership target for ${purpose}.`)
  }
  if (process.env.EXPECTED_DATABASE_NAME && process.env.EXPECTED_DATABASE_NAME !== database) {
    throw new Error(`Database name does not match approved Car-Dealership target for ${purpose}.`)
  }
}


/**
 * Enforce the exact hosted application login and an encrypted connection.
 * This is intentionally separate from assertAllowedDatabaseUrl: migration
 * maintenance uses a different approved role and is never a runtime query.
 *
 * pg 8 currently interprets sslmode=require as verify-full. It remains
 * temporarily accepted for the existing staging deployment, but operators
 * should migrate to explicit sslmode=verify-full before the pg 9 upgrade.
 */
export function assertRuntimeDatabaseUrl(connectionString: string): void {
  assertAllowedDatabaseUrl(connectionString, 'application runtime')
  const env = getCarDealershipEnvironment()
  if (env !== 'staging' && env !== 'demo') return

  const address = new URL(connectionString)
  const expectedRole = env === 'staging' ? 'cd_staging_app' : 'cd_demo_app'
  if (decodeURIComponent(address.username) !== expectedRole) {
    throw new Error('Hosted application must use its restricted environment-specific database role.')
  }

  const sslmode = address.searchParams.get('sslmode')?.toLowerCase()
  if (sslmode !== 'verify-full' && sslmode !== 'require') {
    throw new Error('Hosted database connections require TLS and certificate verification.')
  }
  // Deny ambiguous or weakening driver configuration overrides. In
  // particular, uselibpqcompat=true changes sslmode=require semantics.
  if (address.searchParams.has('ssl') || address.searchParams.has('uselibpqcompat')) {
    throw new Error('Hosted database TLS settings cannot be overridden.')
  }
}
