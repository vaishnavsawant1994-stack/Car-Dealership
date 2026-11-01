import { beforeEach, describe, expect, it, vi } from 'vitest'

const checkDatabaseHealth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/db/health', () => ({ checkDatabaseHealth }))

import { GET } from './route'

describe('GET /api/health', () => {
  beforeEach(() => vi.clearAllMocks())

  it('reports healthy database state without caching', async () => {
    checkDatabaseHealth.mockResolvedValue({ healthy: true, checkedAt: '2026-11-01T00:00:00.000Z', latencyMs: 8 })

    const response = await GET()

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store, max-age=0')
    await expect(response.json()).resolves.toEqual({
      status: 'ok',
      checks: { database: 'ok' },
      checkedAt: '2026-11-01T00:00:00.000Z',
      latencyMs: 8,
    })
  })

  it('returns service unavailable when the database check fails', async () => {
    checkDatabaseHealth.mockResolvedValue({ healthy: false, checkedAt: '2026-11-01T00:00:00.000Z', latencyMs: 1000 })

    const response = await GET()

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toMatchObject({
      status: 'unavailable',
      checks: { database: 'failed' },
    })
  })
})
