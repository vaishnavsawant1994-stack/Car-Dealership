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

  // The historical development name is permitted only for the existing
  // isolated GitHub Actions temporary PostgreSQL CI job.
  const legacyCiFixture = env === 'test' && process.env.CI === 'true' && local && database === 'deccan_wheels'
  if (/optimum|optimus|deccan/i.test(host + '/' + database) && !legacyCiFixture) {
    throw new Error(`Car-Dealership refused a legacy source-looking database target for ${purpose}.`)
  }
  if (env === 'commercial') {
    throw new Error('Commercial database connections are disabled until an independently reviewed production launch.')
  }
  if (env === 'local' || env === 'test') {
    if (!local || !['car_dealership_dev', 'car_dealership_test'].includes(database) && !legacyCiFixture) {
      throw new Error(`Only isolated local/test databases are allowed for ${purpose}.`)
    }
  } else {
    if (local) throw new Error(`Remote ${env} environment cannot use a loopback database for ${purpose}.`)
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
