import 'dotenv/config'
import { afterAll, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { CustomerDataRightsKind, CustomerDataRightsStatus, UserRole } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { createCustomerDataRightsRequest, listCustomerDataRightsRequests } from '@/lib/crm/data-rights-service'

afterAll(async () => prisma.$disconnect())

describe('P4-04 isolated database privacy requests', () => {
  it('logs pending requests, prevents duplicates and never mutates user data', async () => {
    if (process.env.APP_ENV !== 'test' || !process.env.DATABASE_URL?.includes('/car_dealership_test')) {
      throw new Error('Data-rights intake tests require isolated test Postgres.')
    }
    const staff = await prisma.user.findFirstOrThrow({ where: { role: UserRole.SUPER_ADMIN }, select: { id: true } })
    const syntheticEmail = 'privacy-request-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '@car-dealership.test'
    const customer = await prisma.user.create({ data: { email: syntheticEmail, name: 'Fictional Subject' } })
    let requestId: string | null = null
    try {
      const created = await createCustomerDataRightsRequest(customer.id, staff.id, CustomerDataRightsKind.ERASURE)
      expect(created.type).toBe('created')
      if (created.type !== 'created') return
      requestId = created.data.id
      expect(created.data.status).toBe(CustomerDataRightsStatus.PENDING_ID_VERIFICATION)
      const duplicate = await createCustomerDataRightsRequest(customer.id, staff.id, CustomerDataRightsKind.ERASURE)
      expect(duplicate.type).toBe('already-open')
      expect((await listCustomerDataRightsRequests(customer.id)).map((r) => r.id)).toContain(created.data.id)
      const existing = await prisma.user.findUniqueOrThrow({ where: { id: customer.id } })
      expect(existing.email).toBe(syntheticEmail)
      expect(existing.deletedAt).toBeNull()
      const audits = await prisma.auditLog.findMany({ where: { entity: 'CustomerDataRightsRequest', entityId: created.data.id } })
      expect(audits).toHaveLength(1)
      expect(JSON.stringify(audits[0].metadata)).not.toContain(syntheticEmail)
      expect((await createCustomerDataRightsRequest(staff.id, staff.id, CustomerDataRightsKind.ACCESS)).type).toBe('not-found')
    } finally {
      await prisma.auditLog.deleteMany({ where: { entity: 'CustomerDataRightsRequest', entityId: requestId ?? undefined } })
      await prisma.customerDataRightsRequest.deleteMany({ where: { customerId: customer.id } })
      await prisma.user.delete({ where: { id: customer.id } })
    }
  })
})
