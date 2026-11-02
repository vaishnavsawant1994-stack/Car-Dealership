import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { db, getScope } = vi.hoisted(() => {
  const findFirst = () => vi.fn().mockResolvedValue(null)
  return {
    db: {
      inquiry: { findFirst: findFirst() },
      testDrive: { findFirst: findFirst() },
      sellRequest: { findFirst: findFirst() },
      contactMessage: { findFirst: findFirst() },
    },
    getScope: vi.fn(),
  }
})

vi.mock('@/lib/db/prisma', () => ({ prisma: db }))
vi.mock('@/lib/auth/showroom-scope', () => ({ getActorShowroomScope: getScope }))

import { UserRole } from '@prisma/client'
import type { AdminActor } from '@/lib/auth/require-admin'
import { requireAccessibleLead, type LeadKind } from './lead-service'

afterEach(() => {
  for (const model of Object.values(db)) model.findFirst.mockClear()
  getScope.mockReset()
})

describe('lead detail query scope', () => {
  it.each([
    ['enquiries', 'inquiry'],
    ['test-drives', 'testDrive'],
    ['sell-requests', 'sellRequest'],
    ['contact-inquiries', 'contactMessage'],
  ] as const)('applies showroom and assignment predicates to %s before loading nested data', async (kind, model) => {
    getScope.mockResolvedValue({ global: false, showroomIds: ['showroom-a'] })
    const actor = { id: 'sales-a', role: UserRole.SALES } as AdminActor

    await expect(requireAccessibleLead(kind as LeadKind, 'lead-a', actor)).resolves.toBeNull()

    expect(db[model].findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        id: 'lead-a',
        showroomId: { in: ['showroom-a'] },
        OR: [{ assignedToId: null }, { assignedToId: 'sales-a' }],
      },
    }))
  })
})
