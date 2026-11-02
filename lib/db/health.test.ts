import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { queryRaw, logSafeError } = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  logSafeError: vi.fn(),
}))
vi.mock('@/lib/db/prisma', () => ({ prisma: { $queryRaw: queryRaw } }))
vi.mock('@/lib/observability/safe-log', () => ({ logSafeError }))

import { checkDatabaseHealth } from './health'

afterEach(() => {
  queryRaw.mockReset()
  logSafeError.mockReset()
})

describe('database health check', () => {
  it('runs the lightweight database probe and returns only timing metadata', async () => {
    queryRaw.mockResolvedValue([{ '?column?': 1 }])

    const result = await checkDatabaseHealth()

    expect(queryRaw).toHaveBeenCalledOnce()
    expect(result).toMatchObject({ healthy: true })
    expect(result.checkedAt).toMatch(/^\d{4}-\d\d-\d\dT/)
    expect(result.latencyMs).toBeGreaterThanOrEqual(0)
    expect(Object.keys(result).sort()).toEqual(['checkedAt', 'healthy', 'latencyMs'])
  })

  it('sanitizes database errors while recording a safe event', async () => {
    queryRaw.mockRejectedValue(new Error('postgres://user:secret@db.example.test/private'))

    const result = await checkDatabaseHealth()

    expect(result).toMatchObject({ healthy: false })
    expect(JSON.stringify(result)).not.toContain('secret')
    expect(JSON.stringify(result)).not.toContain('db.example.test')
    expect(logSafeError).toHaveBeenCalledWith(
      'database_health_check_failed',
      expect.objectContaining({ message: 'postgres://user:secret@db.example.test/private' }),
    )
  })
})
