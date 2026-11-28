import { describe, expect, it } from 'vitest'
import { marketingCampaignDeliveryEnabled, publicNewsletterSignupEnabled } from './campaign-policy'

describe('P16 marketing safety policy', () => {
  it('keeps public newsletter capture and campaign delivery disabled', () => {
    expect(publicNewsletterSignupEnabled).toBe(false)
    expect(marketingCampaignDeliveryEnabled).toBe(false)
  })
})
