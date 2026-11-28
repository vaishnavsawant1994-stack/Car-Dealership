import { SalesDealAcceptanceMethod, SalesDealLossReason, SalesDealStatus } from '@prisma/client'
import { z } from 'zod'

export const createSalesDealSchema = z.object({
  quoteDraftId: z.string().cuid(),
}).strict()

export const transitionSalesDealSchema = z.object({
  version: z.number().int().positive(),
  status: z.nativeEnum(SalesDealStatus),
  acceptanceMethod: z.nativeEnum(SalesDealAcceptanceMethod).optional(),
  lossReason: z.nativeEnum(SalesDealLossReason).optional(),
}).strict()

export type TransitionSalesDealInput = z.output<typeof transitionSalesDealSchema>

export function assessSalesDealTransition(
  current: SalesDealStatus,
  input: Pick<TransitionSalesDealInput, 'status' | 'acceptanceMethod' | 'lossReason'>,
) {
  const allowed = current === SalesDealStatus.OPEN
    ? [SalesDealStatus.NEGOTIATION, SalesDealStatus.LOST, SalesDealStatus.CANCELLED]
    : current === SalesDealStatus.NEGOTIATION
      ? [SalesDealStatus.OPEN, SalesDealStatus.WON, SalesDealStatus.LOST, SalesDealStatus.CANCELLED]
      : []
  if (!allowed.some((status) => status === input.status)) return { allowed: false as const, code: 'INVALID_TRANSITION' as const }
  if (input.status === SalesDealStatus.WON) {
    if (!input.acceptanceMethod || input.lossReason) return { allowed: false as const, code: 'ACCEPTANCE_REQUIRED' as const }
  } else if (input.status === SalesDealStatus.LOST) {
    if (!input.lossReason || input.acceptanceMethod) return { allowed: false as const, code: 'LOSS_REASON_REQUIRED' as const }
  } else if (input.acceptanceMethod || input.lossReason) {
    return { allowed: false as const, code: 'UNEXPECTED_OUTCOME_DETAIL' as const }
  }
  return { allowed: true as const }
}
