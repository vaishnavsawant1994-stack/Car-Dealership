import 'dotenv/config'

import { createScriptPrismaClient } from './script-prisma'
import { logSafeError } from '../lib/observability/safe-log'

const prisma = createScriptPrismaClient()
const startedAt = performance.now()

try {
  await prisma.$queryRaw`SELECT 1`
  console.log(`PostgreSQL is healthy (${Math.round(performance.now() - startedAt)} ms).`)
} catch (error) {
  logSafeError('database_health_check_failed', error)
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}

