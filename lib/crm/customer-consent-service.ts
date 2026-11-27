import 'server-only'

import { Prisma, UserRole } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { hasCurrentMarketingConsent, type MarketingChannel } from './customer-consent'

/**
 * Administrators can suppress promotional communication; they cannot give
 * consent for a customer. Opting back in needs independently verified,
 * customer-initiated authorization and is intentionally absent here.
 */
export async function withdrawCustomerMarketingConsent(
  customerId: string, actorId: string, channel: MarketingChannel,
) {
  return prisma.$transaction(async (tx) => {
    const customer = await tx.user.findFirst({
      where: { id: customerId, role: UserRole.CUSTOMER, deletedAt: null },
      select: {
        id: true, notificationSettings: {
          select: {
            marketingEmails: true, whatsAppUpdates: true,
            marketingConsentedAt: true, whatsAppConsentedAt: true,
          },
        },
      },
    })
    if (!customer) return { type: 'not-found' as const }

    const settings = customer.notificationSettings
    if (!hasCurrentMarketingConsent(settings, channel)) {
      // A legacy inconsistent true-without-timestamp record is also denied.
      // If it is enabled, write false and audit the correction.
      if (!settings || settings[channel] !== true) return { type: 'already-withdrawn' as const }
    }

    const changed = await tx.customerNotificationSettings.updateMany({
      where: { userId: customerId, [channel]: true },
      data: { [channel]: false },
    })
    if (!changed.count) return { type: 'already-withdrawn' as const }

    await tx.auditLog.create({
      data: {
        actorId,
        action: 'CUSTOMER_MARKETING_CONSENT_WITHDRAWN',
        entity: 'CustomerNotificationSettings',
        entityId: settings?.marketingConsentedAt ? customerId : customerId,
        resourceType: 'User',
        resourceId: customerId,
        summary: 'Disabled customer promotional communication through a restricted staff action.',
        metadata: { channel },
      },
    })
    return { type: 'withdrawn' as const, channel }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
}
