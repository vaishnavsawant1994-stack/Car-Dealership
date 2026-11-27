import { z } from 'zod'

export const createIndicativeQuoteSchema = z.object({
  discountAmount: z.number().int().min(0).max(100_000_000),
  estimatedOtherFees: z.number().int().min(0).max(100_000_000),
  note: z.string().trim().max(500).optional(),
}).strict()

export type IndicativeQuoteInput = z.output<typeof createIndicativeQuoteSchema>

/** Integer INR snapshot; no tax or statutory charges are computed by this worksheet. */
export function estimateVehicleQuote(vehiclePrice: number, input: IndicativeQuoteInput) {
  if (!Number.isSafeInteger(vehiclePrice) || vehiclePrice <= 0) return null
  if (!Number.isSafeInteger(input.discountAmount) || input.discountAmount < 0 ||
      input.discountAmount > vehiclePrice) return null
  if (!Number.isSafeInteger(input.estimatedOtherFees) || input.estimatedOtherFees < 0) return null
  const subtotal = vehiclePrice - input.discountAmount + input.estimatedOtherFees
  if (!Number.isSafeInteger(subtotal) || subtotal < 0) return null
  return { vehiclePrice, discountAmount: input.discountAmount,
    estimatedOtherFees: input.estimatedOtherFees, estimatedSubtotal: subtotal, currency: 'INR' as const }
}
