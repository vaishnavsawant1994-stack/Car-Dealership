import 'server-only'

import { prisma } from '@/lib/db/prisma'

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
    console.error('[database-health] PostgreSQL connectivity check failed.', {
      errorType: error instanceof Error ? error.name : 'UnknownError',
    })
    return {
      healthy: false,
      checkedAt: new Date().toISOString(),
      latencyMs: Math.round(performance.now() - startedAt),
    }
  }
}

