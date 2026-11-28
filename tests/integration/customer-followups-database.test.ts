import 'dotenv/config'
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { UserRole, UserStatus } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { completeCustomerFollowUp, createCustomerFollowUp, listCustomerFollowUps } from '@/lib/crm/customer-followup-service'

const created: string[] = []
afterEach(async () => {
  const ids = created.splice(0)
  if (ids.length) {
    await prisma.auditLog.deleteMany({ where: { entity: 'OperationalFollowUp', entityId: { in: ids } } })
    await prisma.operationalFollowUp.deleteMany({ where: { id: { in: ids } } })
  }
})
afterAll(async () => prisma.$disconnect())

describe('P4-02 isolated customer follow-up lifecycle', () => {
  it('records one admin-only task, idempotent completion and two audit entries', async () => {
    if (process.env.APP_ENV !== 'test' || !process.env.DATABASE_URL?.includes('/car_dealership_test')) {
      throw new Error('Only run customer follow-up integration tests against the isolated CI test database.')
    }
    const [actor, customer] = await Promise.all([
      prisma.user.findFirstOrThrow({
        where: { role: { in: [UserRole.ADMIN, UserRole.SUPER_ADMIN] },
          status: UserStatus.ACTIVE, emailVerified: { not: null }, deletedAt: null },
      }),
      prisma.user.findFirstOrThrow({ where: { role: UserRole.CUSTOMER, deletedAt: null } }),
    ])
    const dueAt = new Date(Date.now() + 2 * 86_400_000).toISOString()
    const result = await createCustomerFollowUp(customer.id, actor, {
      title: 'Review synthetic customer inquiry', dueAt, assignedToId: actor.id,
    })
    expect(result.type).toBe('created')
    if (result.type !== 'created') return
    created.push(result.data.id)
    expect(result.data.assignedToId).toBe(actor.id)
    const list = await listCustomerFollowUps(customer.id)
    expect(list.some((row) => row.id === result.data.id)).toBe(true)

    expect((await completeCustomerFollowUp('other-id', result.data.id, actor)).type).toBe('not-found')
    expect((await completeCustomerFollowUp(customer.id, result.data.id, actor)).type).toBe('completed')
    expect((await completeCustomerFollowUp(customer.id, result.data.id, actor)).type).toBe('already-completed')

    const audits = await prisma.auditLog.findMany({
      where: { entity: 'OperationalFollowUp', entityId: result.data.id }, select: { action: true },
    })
    expect(audits.map((item) => item.action).sort()).toEqual([
      'CUSTOMER_FOLLOW_UP_COMPLETED', 'CUSTOMER_FOLLOW_UP_CREATED',
    ])
  })
})
