import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ findUnique: vi.fn(), upsert: vi.fn(), checkRateLimit: vi.fn() }))

vi.mock('@/lib/security/demo-access', () => ({ isHostedDemoEnvironment: () => false }))
vi.mock('@/lib/db/prisma', () => ({ prisma: { newsletterSubscriber: { findUnique: mocks.findUnique, upsert: mocks.upsert } } }))
vi.mock('@/lib/security/rate-limit', () => ({ checkRateLimit: mocks.checkRateLimit, requestFingerprint: () => 'synthetic-request' }))

import { POST } from './route'

describe('P16 disabled public marketing signup', () => {
  it('rejects public capture before rate limiting or database access', async () => {
    const response = await POST(new Request('https://car-dealership.test/api/newsletter', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'person@example.test' }),
    }))
    expect(response.status).toBe(403)
    expect(mocks.checkRateLimit).not.toHaveBeenCalled()
    expect(mocks.findUnique).not.toHaveBeenCalled()
    expect(mocks.upsert).not.toHaveBeenCalled()
  })
})
