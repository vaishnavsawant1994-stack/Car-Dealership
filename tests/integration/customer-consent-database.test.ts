import 'dotenv/config'
import { afterAll, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { UserRole } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { withdrawCustomerMarketingConsent } from '@/lib/crm/customer-consent-service'

afterAll(async () => prisma.$disconnect())

describe('P4-03 isolated PostgreSQL consent withdrawal', () => {
  it('records a single opt-out and preserves original opt-in evidence', async () => {
    if (process.env.APP_ENV !== 'test' || !process.env.DATABASE_URL?.includes('/car_dealership_test')) {
      throw new Error('Customer privacy integration tests require isolated CI PostgreSQL.')
    }
    const actor = await prisma.user.findFirstOrThrow({ where: { role: UserRole.SUPER_ADMIN }, select: { id: true } })
    const marker = 'privacy-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)
    const originalConsent = new Date('2026-10-01T08:00:00Z')
    const customer = await prisma.user.create({
      data: {
        email: marker + '@car-dealership.test', name: 'Synthetic Privacy Customer',
        role: UserRole.CUSTOMER,
        notificationSettings: { create: {
          marketingEmails: true, marketingConsentedAt: originalConsent,
          whatsAppUpdates: true, whatsAppConsentedAt: originalConsent,
        } },
      },
    })
    try {
      expect((await withdrawCustomerMarketingConsent(customer.id, actor.id, 'marketingEmails')).type).toBe('withdrawn')
      expect((await withdrawCustomerMarketingConsent(customer.id, actor.id, 'marketingEmails')).type).toBe('already-withdrawn')
      const settings = await prisma.customerNotificationSettings.findUniqueOrThrow({ where: { userId: customer.id } })
      expect(settings.marketingEmails).toBe(false)
      expect(settings.whatsAppUpdates).toBe(true)
      expect(settings.marketingConsentedAt).toEqual(originalConsent)
      const audits = await prisma.auditLog.findMany({ where: {
        resourceType: 'User', resourceId: customer.id, action: 'CUSTOMER_MARKETING_CONSENT_WITHDRAWN',
      } })
      expect(audits).toHaveLength(1)
      expect(JSON.stringify(audits[0].metadata)).not.toContain(customer.email)
      expect((await withdrawCustomerMarketingConsent(actor.id, actor.id, 'marketingEmails')).type).toBe('not-found')
    } finally {
      await prisma.auditLog.deleteMany({ where: { resourceType: 'User', resourceId: customer.id } })
      await prisma.user.delete({ where: { id: customer.id } })
    }
  })
})
