import { createHash } from 'node:crypto'

export type SandboxOutcome = 'APPROVED' | 'DECLINED'
export type PaymentMode = 'disabled' | 'sandbox'
type PaymentEnvironment = { APP_ENV?: string; PAYMENT_MODE?: string }

export function paymentMode(environment: PaymentEnvironment = process.env): PaymentMode {
  if (environment.PAYMENT_MODE === 'sandbox' && ['test', 'preview'].includes(environment.APP_ENV ?? '')) return 'sandbox'
  return 'disabled'
}

export interface SandboxPaymentProvider {
  simulate(input: { amount: number; currency: 'INR'; idempotencyKey: string; outcome: SandboxOutcome }): {
    simulatorReference: string
    outcome: SandboxOutcome
  }
}

/** Local deterministic adapter: no SDK, secrets, network, card data, capture, or settlement. */
export function createSandboxPaymentProvider(): SandboxPaymentProvider {
  return {
    simulate({ idempotencyKey, outcome }) {
      const digest = createHash('sha256').update(idempotencyKey).digest('hex').slice(0, 24).toUpperCase()
      return { simulatorReference: `SIM-${digest}`, outcome }
    },
  }
}
