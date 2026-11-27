import 'server-only'

import { prisma } from '@/lib/db/prisma'
import { logSafeError } from '@/lib/observability/safe-log'

export type DatabaseHealth = {
  healthy: boolean
  checkedAt: string
  latencyMs: number
}

export async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  const startedAt = performance.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    return {
      healthy: true,
      checkedAt: new Date().toISOString(),
      latencyMs: Math.round(performance.now() - startedAt),
    }
  } catch (error) {
    logSafeError('database_health_check_failed', error)
    return {
      healthy: false,
      checkedAt: new Date().toISOString(),
      latencyMs: Math.round(performance.now() - startedAt),
    }
  }
}

