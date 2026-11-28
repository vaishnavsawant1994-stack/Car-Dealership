import 'server-only'

import { Prisma, UserRole, UserStatus } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'

export type CustomerNotificationInput = {
  enquiryUpdates: boolean
  testDriveReminders: boolean
  priceChangeAlerts: boolean
  soldVehicleAlerts: boolean
  marketingEmails: boolean
  whatsAppUpdates: boolean
}

/** Self-service only. Marketing channels are preferences; no outbound send is triggered here. */
export async function updateCustomerNotificationSettings(userId: string, input: CustomerNotificationInput) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findFirst({ where: { id: userId, role: UserRole.CUSTOMER, status: UserStatus.ACTIVE,
      emailVerified: { not: null }, deletedAt: null }, select: { id: true, notificationSettings: true } })
    if (!user) return { type: 'not-customer' as const }
    const previous = user.notificationSettings
    const settings = await tx.customerNotificationSettings.upsert({ where: { userId }, update: {
      ...input,
      marketingConsentedAt: input.marketingEmails ? previous?.marketingConsentedAt ?? new Date() : previous?.marketingConsentedAt ?? null,
      whatsAppConsentedAt: input.whatsAppUpdates ? previous?.whatsAppConsentedAt ?? new Date() : previous?.whatsAppConsentedAt ?? null,
    }, create: { userId, ...input,
      marketingConsentedAt: input.marketingEmails ? new Date() : null,
      whatsAppConsentedAt: input.whatsAppUpdates ? new Date() : null,
    } })
    const consentChanged = (previous?.marketingEmails ?? false) !== input.marketingEmails || (previous?.whatsAppUpdates ?? false) !== input.whatsAppUpdates
    await tx.auditLog.create({ data: { actorId: userId, action: 'CUSTOMER_NOTIFICATION_PREFERENCES_UPDATED',
      entity: 'CustomerNotificationSettings', entityId: userId, resourceType: 'User', resourceId: userId,
      summary: 'Customer updated account notification preferences.', metadata: {
        previousMarketingEmailConsent: previous?.marketingEmails ?? false,
        marketingEmailConsent: input.marketingEmails,
        previousWhatsAppConsent: previous?.whatsAppUpdates ?? false,
        whatsAppConsent: input.whatsAppUpdates,
        consentChanged,
      } } })
    return { type: 'updated' as const, data: settings }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
}
