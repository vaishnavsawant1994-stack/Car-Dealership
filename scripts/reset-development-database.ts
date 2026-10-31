import 'dotenv/config'

import { spawnSync } from 'node:child_process'
import { assertAllowedDatabaseUrl } from '../lib/config/isolation'

if (process.env.NODE_ENV === 'production') throw new Error('Database reset is disabled in production.')
if (process.env.APP_ENV && process.env.APP_ENV !== 'local') throw new Error('Reset requires APP_ENV=local.')

const runtimeUrl = process.env.DATABASE_URL
const migrationUrl = process.env.DIRECT_URL ?? runtimeUrl
if (!runtimeUrl || !migrationUrl) throw new Error('DATABASE_URL and DIRECT_URL are required.')

assertAllowedDatabaseUrl(runtimeUrl, 'development reset runtime')
assertAllowedDatabaseUrl(migrationUrl, 'development reset migration')

const target = new URL(migrationUrl)
if (!['localhost', '127.0.0.1', '::1'].includes(target.hostname) ||
    decodeURIComponent(target.pathname.slice(1)) !== 'car_dealership_dev') {
  throw new Error('Reset is only allowed against a local car_dealership_dev database.')
}
if (new URL(runtimeUrl).pathname !== target.pathname) {
  throw new Error('Runtime and migration database names differ; reset refused.')
}

const executable = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const result = spawnSync(executable, ['prisma', 'migrate', 'reset', '--force'], {
  stdio: 'inherit',
  env: process.env,
})

if (result.status !== 0) process.exitCode = result.status ?? 1
