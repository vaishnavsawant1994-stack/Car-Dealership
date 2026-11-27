import { z } from 'zod'

export const marketingChannels = ['marketingEmails', 'whatsAppUpdates'] as const
export type MarketingChannel = (typeof marketingChannels)[number]
export const withdrawConsentSchema = z.object({
  channel: z.enum(marketingChannels),
}).strict()

export type ConsentSnapshot = {
  marketingEmails: boolean
  whatsAppUpdates: boolean
  marketingConsentedAt: Date | null
  whatsAppConsentedAt: Date | null
}

/**
 * Fail closed: missing settings are not consent. Historical consent timestamps
 * are evidence of the original opt-in, not proof of current permission.
 */
export function hasCurrentMarketingConsent(
  snapshot: ConsentSnapshot | null,
  channel: MarketingChannel,
): boolean {
  if (!snapshot) return false
  const timestamp = channel === 'marketingEmails'
    ? snapshot.marketingConsentedAt : snapshot.whatsAppConsentedAt
  return snapshot[channel] === true && timestamp instanceof Date &&
    Number.isFinite(timestamp.valueOf())
}

export function consentDisplay(snapshot: ConsentSnapshot | null) {
  return marketingChannels.map((channel) => ({
    channel,
    consented: hasCurrentMarketingConsent(snapshot, channel),
    rawEnabled: snapshot?.[channel] === true,
    everConsentedAt: channel === 'marketingEmails' ?
      snapshot?.marketingConsentedAt ?? null : snapshot?.whatsAppConsentedAt ?? null,
  }))
}
