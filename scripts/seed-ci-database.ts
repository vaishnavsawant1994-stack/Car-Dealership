import 'dotenv/config'

import { randomBytes } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { passwordSchema } from '../lib/auth/password'
import { assertAllowedDatabaseUrl } from '../lib/config/isolation'

const connectionString = process.env.DATABASE_URL
if (process.env.NODE_ENV !== 'test' || process.env.APP_ENV !== 'test' || !connectionString) {
  throw new Error('CI fixture seeding requires the isolated test environment.')
}

assertAllowedDatabaseUrl(connectionString, 'CI fixture seeding')
const database = new URL(connectionString)
if (!['localhost', '127.0.0.1', '::1'].includes(database.hostname) ||
    decodeURIComponent(database.pathname.slice(1)) !== 'car_dealership_test') {
  throw new Error('CI fixture seeding is restricted to car_dealership_test on loopback.')
}

let password = ''
do {
  password = randomBytes(48).toString('base64')
} while (!passwordSchema.safeParse(password).success)

const prismaCli = resolve(process.cwd(), 'node_modules', 'prisma', 'build', 'index.js')
const result = spawnSync(process.execPath, [prismaCli, 'db', 'seed'], {
  env: { ...process.env, SEED_ADMIN_PASSWORD: password },
  stdio: 'inherit',
})

if (result.error) throw new Error('Could not start Prisma CI fixture seeding.')
if (result.status !== 0) process.exitCode = result.status ?? 1
