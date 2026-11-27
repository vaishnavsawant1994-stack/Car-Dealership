import { afterEach, describe, expect, it, vi } from 'vitest'

const { checkDatabaseHealth } = vi.hoisted(() => ({ checkDatabaseHealth: vi.fn() }))
vi.mock('@/lib/db/health', () => ({ checkDatabaseHealth }))

import { GET } from './route'

afterEach(() => checkDatabaseHealth.mockReset())

describe('GET /api/health', () => {
  it('returns an uncached 200 response when the database check succeeds', async () => {
    checkDatabaseHealth.mockResolvedValue({
      healthy: true,
      checkedAt: '2026-11-02T00:00:00.000Z',
      latencyMs: 4,
    })

    const response = await GET()

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store, max-age=0')
    await expect(response.json()).resolves.toEqual({
      status: 'ok',
      checks: { database: 'ok' },
      checkedAt: '2026-11-02T00:00:00.000Z',
      latencyMs: 4,
    })
  })

  it('returns an uncached 503 response without driver details when the database check fails', async () => {
    checkDatabaseHealth.mockResolvedValue({
      healthy: false,
      checkedAt: '2026-11-02T00:00:00.000Z',
      latencyMs: 8,
    })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(response.headers.get('Cache-Control')).toBe('no-store, max-age=0')
    expect(body).toEqual({
      status: 'unavailable',
      checks: { database: 'failed' },
      checkedAt: '2026-11-02T00:00:00.000Z',
      latencyMs: 8,
    })
    expect(JSON.stringify(body)).not.toContain('password')
    expect(JSON.stringify(body)).not.toContain('connection')
  })
})
