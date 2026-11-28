import { describe, expect, it } from 'vitest'
import { createSandboxPaymentProvider, paymentMode } from './sandbox'

describe('payment sandbox boundary', () => {
  it('defaults to disabled and never enables in staging, demo, local, or commercial', () => {
    expect(paymentMode({})).toBe('disabled')
    for (const APP_ENV of ['local', 'staging', 'demo', 'commercial']) {
      expect(paymentMode({ APP_ENV, PAYMENT_MODE: 'sandbox' })).toBe('disabled')
    }
    expect(paymentMode({ APP_ENV: 'preview', PAYMENT_MODE: 'live' })).toBe('disabled')
  })

  it('allows only explicitly selected test or protected preview simulation mode', () => {
    expect(paymentMode({ APP_ENV: 'test', PAYMENT_MODE: 'sandbox' })).toBe('sandbox')
    expect(paymentMode({ APP_ENV: 'preview', PAYMENT_MODE: 'sandbox' })).toBe('sandbox')
  })

  it('returns deterministic simulation references without contacting a provider', () => {
    const provider = createSandboxPaymentProvider()
    const first = provider.simulate({ amount: 1_000, currency: 'INR', idempotencyKey: 'test-idempotency-key-12345678', outcome: 'APPROVED' })
    const second = provider.simulate({ amount: 1_000, currency: 'INR', idempotencyKey: 'test-idempotency-key-12345678', outcome: 'APPROVED' })
    expect(first).toEqual(second)
    expect(first.simulatorReference).toMatch(/^SIM-[A-F0-9]{24}$/)
  })
})
