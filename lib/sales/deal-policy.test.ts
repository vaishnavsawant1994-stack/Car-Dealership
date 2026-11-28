import { SalesDealAcceptanceMethod, SalesDealLossReason, SalesDealStatus } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import { assessSalesDealTransition, createSalesDealSchema, transitionSalesDealSchema } from './deal-policy'

describe('sales deal lifecycle policy', () => {
  it('permits only the explicit open and negotiation transitions', () => {
    expect(assessSalesDealTransition(SalesDealStatus.OPEN, { status: SalesDealStatus.NEGOTIATION })).toEqual({ allowed: true })
    expect(assessSalesDealTransition(SalesDealStatus.NEGOTIATION, { status: SalesDealStatus.OPEN })).toEqual({ allowed: true })
    expect(assessSalesDealTransition(SalesDealStatus.WON, { status: SalesDealStatus.NEGOTIATION })).toMatchObject({ code: 'INVALID_TRANSITION' })
    expect(assessSalesDealTransition(SalesDealStatus.LOST, { status: SalesDealStatus.OPEN })).toMatchObject({ code: 'INVALID_TRANSITION' })
    expect(assessSalesDealTransition(SalesDealStatus.CANCELLED, { status: SalesDealStatus.NEGOTIATION })).toMatchObject({ code: 'INVALID_TRANSITION' })
  })

  it('requires a recorded acceptance method for won deals and a coded reason for lost deals', () => {
    expect(assessSalesDealTransition(SalesDealStatus.NEGOTIATION, { status: SalesDealStatus.WON }))
      .toMatchObject({ code: 'ACCEPTANCE_REQUIRED' })
    expect(assessSalesDealTransition(SalesDealStatus.NEGOTIATION, {
      status: SalesDealStatus.WON, acceptanceMethod: SalesDealAcceptanceMethod.CUSTOMER_EMAIL,
    })).toEqual({ allowed: true })
    expect(assessSalesDealTransition(SalesDealStatus.OPEN, { status: SalesDealStatus.LOST }))
      .toMatchObject({ code: 'LOSS_REASON_REQUIRED' })
    expect(assessSalesDealTransition(SalesDealStatus.OPEN, {
      status: SalesDealStatus.LOST, lossReason: SalesDealLossReason.PURCHASED_ELSEWHERE,
    })).toEqual({ allowed: true })
  })

  it('rejects outcome evidence on unrelated transitions and validates strict inputs', () => {
    expect(assessSalesDealTransition(SalesDealStatus.OPEN, {
      status: SalesDealStatus.NEGOTIATION, acceptanceMethod: SalesDealAcceptanceMethod.SIGNED_ORDER_FORM,
    })).toMatchObject({ code: 'UNEXPECTED_OUTCOME_DETAIL' })
    expect(createSalesDealSchema.safeParse({ quoteDraftId: 'bad', unexpected: true }).success).toBe(false)
    expect(transitionSalesDealSchema.safeParse({ version: 1, status: 'WON' }).success).toBe(true)
    expect(transitionSalesDealSchema.safeParse({ version: 0, status: 'OPEN' }).success).toBe(false)
  })
})
