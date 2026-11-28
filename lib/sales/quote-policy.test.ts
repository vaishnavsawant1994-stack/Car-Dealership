import { describe, expect, it } from 'vitest'
import { createIndicativeQuoteSchema, estimateVehicleQuote } from './quote-policy'

describe('P5-02 indicative sales price worksheet rules', () => {
  it('takes a snapshot of vehicle list price and computes integer INR totals', () => {
    const input = { discountAmount: 50_000, estimatedOtherFees: 7_500 }
    expect(createIndicativeQuoteSchema.safeParse(input).success).toBe(true)
    expect(estimateVehicleQuote(2_000_000, input)).toEqual({
      vehiclePrice: 2_000_000, discountAmount: 50_000,
      estimatedOtherFees: 7_500, estimatedSubtotal: 1_957_500, currency: 'INR',
    })
  })
  it('refuses negative totals, excessive discounts, invalid numbers and unsupported extra fields', () => {
    expect(estimateVehicleQuote(1_000, { discountAmount: 1_001, estimatedOtherFees: 0 })).toBeNull()
    expect(estimateVehicleQuote(0, { discountAmount: 0, estimatedOtherFees: 0 })).toBeNull()
    expect(estimateVehicleQuote(1_000, { discountAmount: 0, estimatedOtherFees: Number.NaN })).toBeNull()
    expect(createIndicativeQuoteSchema.safeParse({ discountAmount: -1, estimatedOtherFees: 0 }).success).toBe(false)
    expect(createIndicativeQuoteSchema.safeParse({ discountAmount: 2.5, estimatedOtherFees: 0 }).success).toBe(false)
    expect(createIndicativeQuoteSchema.safeParse({ discountAmount: 0, estimatedOtherFees: 0, sendToCustomer: true }).success).toBe(false)
  })
})
