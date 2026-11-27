import { RequestStatus, VehicleStatus } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import { assessProcurementDraftEligibility, convertProcurementSchema } from './draft-conversion'

const validEvidence = {
  status: RequestStatus.COMPLETED,
  inspection: {
    completedAt: new Date('2026-11-14T00:00:00Z'),
    documentsVerified: true,
    overallConditionScore: 8,
  },
  valuations: [{ finalOffer: 4_500_000 }],
}

describe('P2-03 acquisition to inventory draft gate', () => {
  it('requires completed acquisition and documentary inspection evidence', () => {
    expect(assessProcurementDraftEligibility(validEvidence)).toEqual({ eligible: true, missing: [] })
    const unready = assessProcurementDraftEligibility({
      ...validEvidence, status: RequestStatus.OFFER_MADE,
      inspection: null, valuations: [],
    })
    expect(unready.eligible).toBe(false)
    expect(unready.missing).toHaveLength(3)
  })

  it('rejects a missing final acquisition offer', () => {
    const unready = assessProcurementDraftEligibility({ ...validEvidence, valuations: [{ finalOffer: null }] })
    expect(unready.missing).toContain('A recorded final acquisition offer is required.')
  })

  it('requires validated full vehicle facts and a positive request version', () => {
    expect(convertProcurementSchema.safeParse({ version: 0, vehicle: {} }).success).toBe(false)
    expect(convertProcurementSchema.safeParse({ version: 1, vehicle: { model: 'Incomplete' } }).success).toBe(false)
    expect(convertProcurementSchema.safeParse({ version: 1, vehicle: {}, unexpected: true }).success).toBe(false)
    expect(VehicleStatus.DRAFT).toBe('DRAFT')
  })
})
