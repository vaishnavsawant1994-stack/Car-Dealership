import { describe, expect, it } from 'vitest'
import { consentDisplay, hasCurrentMarketingConsent, withdrawConsentSchema } from './customer-consent'

const consentedAt = new Date('2026-11-01T00:00:00Z')

describe('P4-03 promotional consent and suppression', () => {
  it('defaults to no consent for missing records', () => {
    expect(hasCurrentMarketingConsent(null, 'marketingEmails')).toBe(false)
    expect(hasCurrentMarketingConsent(null, 'whatsAppUpdates')).toBe(false)
    expect(consentDisplay(null).map((row) => row.consented)).toEqual([false, false])
  })
  it('does not mistake a historical timestamp for active permission', () => {
    const record = {
      marketingEmails: false, whatsAppUpdates: false,
      marketingConsentedAt: consentedAt, whatsAppConsentedAt: consentedAt,
    }
    expect(hasCurrentMarketingConsent(record, 'marketingEmails')).toBe(false)
    expect(hasCurrentMarketingConsent(record, 'whatsAppUpdates')).toBe(false)
    expect(consentDisplay(record)[0].everConsentedAt).toEqual(consentedAt)
    expect(consentDisplay(record)[0].rawEnabled).toBe(false)
  })
  it('fails closed on flags set without a recorded opt-in date', () => {
    expect(hasCurrentMarketingConsent({
      marketingEmails: true, marketingConsentedAt: null,
      whatsAppUpdates: true, whatsAppConsentedAt: null,
    }, 'marketingEmails')).toBe(false)
    expect(consentDisplay({ marketingEmails: true, marketingConsentedAt: null, whatsAppUpdates: false, whatsAppConsentedAt: null })[0].rawEnabled).toBe(true)
  })
  it('accepts only explicit withdrawal channels and rejects opt-in attempts', () => {
    expect(withdrawConsentSchema.safeParse({ channel: 'marketingEmails' }).success).toBe(true)
    expect(withdrawConsentSchema.safeParse({ channel: 'whatsAppUpdates' }).success).toBe(true)
    for (const bad of [
      { channel: 'transactional' },
      { channel: 'marketingEmails', enabled: true },
      { channel: 'marketingEmails', customerId: 'someone-else' },
    ]) expect(withdrawConsentSchema.safeParse(bad).success).toBe(false)
  })
})
