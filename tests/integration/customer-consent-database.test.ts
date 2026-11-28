import 'dotenv/config'
import { afterAll, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { UserRole, UserStatus } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { withdrawCustomerMarketingConsent } from '@/lib/crm/customer-consent-service'
import { updateCustomerNotificationSettings } from '@/lib/crm/customer-settings-service'

afterAll(async () => prisma.$disconnect())

describe('P15 isolated PostgreSQL customer consent controls', () => {
  it('records customer opt-in, later opt-out, and preserves consent history', async () => {
    if (process.env.APP_ENV !== 'test' || !process.env.DATABASE_URL?.includes('/car_dealership_test')) {
      throw new Error('Customer privacy integration tests require isolated CI PostgreSQL.')
    }
    const actor = await prisma.user.findFirstOrThrow({ where: { role: UserRole.SUPER_ADMIN }, select: { id: true } })
    const marker = 'privacy-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)
    const customer = await prisma.user.create({
      data: {
        email: marker + '@car-dealership.test', name: 'Synthetic Privacy Customer',
        role: UserRole.CUSTOMER, status: UserStatus.ACTIVE, emailVerified: new Date(),
      },
    })
    try {
      const optIn = await updateCustomerNotificationSettings(customer.id, {
        enquiryUpdates: true, testDriveReminders: true, priceChangeAlerts: false, soldVehicleAlerts: false,
        marketingEmails: true, whatsAppUpdates: true,
      })
      expect(optIn.type).toBe('updated')
      if (optIn.type !== 'updated') return
      const originalConsent = optIn.data.marketingConsentedAt
      expect(originalConsent).toBeInstanceOf(Date)
      expect(optIn.data.whatsAppConsentedAt).toBeInstanceOf(Date)
      expect((await updateCustomerNotificationSettings(actor.id, {
        enquiryUpdates: false, testDriveReminders: false, priceChangeAlerts: false, soldVehicleAlerts: false,
        marketingEmails: true, whatsAppUpdates: true,
      })).type).toBe('not-customer')
      const selfOptOut = await updateCustomerNotificationSettings(customer.id, {
        enquiryUpdates: true, testDriveReminders: true, priceChangeAlerts: false, soldVehicleAlerts: false,
        marketingEmails: false, whatsAppUpdates: true,
      })
      expect(selfOptOut.type).toBe('updated')
      if (selfOptOut.type !== 'updated') return
      expect(selfOptOut.data.marketingEmails).toBe(false)
      expect(selfOptOut.data.marketingConsentedAt).toEqual(originalConsent)
      const reOptIn = await updateCustomerNotificationSettings(customer.id, {
        enquiryUpdates: true, testDriveReminders: true, priceChangeAlerts: false, soldVehicleAlerts: false,
        marketingEmails: true, whatsAppUpdates: true,
      })
      expect(reOptIn.type).toBe('updated')
      if (reOptIn.type !== 'updated') return
      expect(reOptIn.data.marketingConsentedAt).toEqual(originalConsent)
      expect((await withdrawCustomerMarketingConsent(customer.id, actor.id, 'marketingEmails')).type).toBe('withdrawn')
      expect((await withdrawCustomerMarketingConsent(customer.id, actor.id, 'marketingEmails')).type).toBe('already-withdrawn')
      const settings = await prisma.customerNotificationSettings.findUniqueOrThrow({ where: { userId: customer.id } })
      expect(settings.marketingEmails).toBe(false)
      expect(settings.whatsAppUpdates).toBe(true)
      expect(settings.marketingConsentedAt).toEqual(originalConsent)
      expect(await prisma.auditLog.count({ where: { entity: 'CustomerNotificationSettings', entityId: customer.id,
        action: 'CUSTOMER_NOTIFICATION_PREFERENCES_UPDATED' } })).toBe(3)
      const preferenceAudit = await prisma.auditLog.findFirstOrThrow({ where: { entity: 'CustomerNotificationSettings', entityId: customer.id,
        action: 'CUSTOMER_NOTIFICATION_PREFERENCES_UPDATED' }, orderBy: { createdAt: 'asc' } })
      expect(preferenceAudit.metadata).toMatchObject({ previousMarketingEmailConsent: false, marketingEmailConsent: true, consentChanged: true })
      expect(JSON.stringify(preferenceAudit.metadata)).not.toContain(customer.email)
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
