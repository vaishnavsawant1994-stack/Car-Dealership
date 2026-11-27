import { RequestStatus, UserRole } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import { assessInspectionReadiness, inspectableIntakeStatuses } from './inspection-readiness'
import { procurementAssignmentScope } from './intake'

const completed = {
  exteriorScore: 8,
  interiorScore: 8,
  mechanicalScore: 9,
  overallConditionScore: 9,
  documentsVerified: true,
  serviceHistoryVerified: true,
  completedAt: new Date('2026-11-14T00:00:00.000Z'),
}

describe('P2-02 inspection evidence readiness', () => {
  it('accepts only the inspection-stage portion of the canonical seller workflow', () => {
    expect(inspectableIntakeStatuses).toContain(RequestStatus.INSPECTION_SCHEDULED)
    expect(inspectableIntakeStatuses).toContain(RequestStatus.INSPECTED)
    expect(inspectableIntakeStatuses).not.toContain(RequestStatus.COMPLETED)
    expect(inspectableIntakeStatuses).not.toContain(RequestStatus.DRAFT)
  })

  it('reports missing fields on an uninspected intake', () => {
    const result = assessInspectionReadiness(null)
    expect(result.ready).toBe(false)
    expect(result.finalized).toBe(false)
    expect(result.missing).toContain('Documents verification')
    expect(result.missing).toContain('Mechanical score')
    expect(result.overallScore).toBeNull()
  })

  it('recognizes complete and finalized inspection evidence', () => {
    expect(assessInspectionReadiness(completed)).toMatchObject({
      ready: true,
      finalized: true,
      overallScore: 9,
      missing: [],
      advisories: [],
    })
  })

  it('signals missing finalization and optional service-history verification', () => {
    const r = assessInspectionReadiness({ ...completed, completedAt: null, serviceHistoryVerified: false })
    expect(r.ready).toBe(true)
    expect(r.finalized).toBe(false)
    expect(r.advisories.join(' ')).toContain('Service history')
    expect(r.advisories.join(' ')).toContain('not been finalized')
  })

  it('reports inconsistent finalized timestamps and out-of-range scores', () => {
    const r = assessInspectionReadiness({ ...completed, exteriorScore: 11, documentsVerified: false })
    expect(r.ready).toBe(false)
    expect(r.finalized).toBe(false)
    expect(r.missing).toEqual(expect.arrayContaining(['Exterior score', 'Documents verification']))
    expect(r.advisories.join(' ')).toContain('missing required evidence')
  })

  it('retains assignment scoping for operational staff', () => {
    expect(procurementAssignmentScope({ id: 'fictional-ops', role: UserRole.OPERATIONS }, 'all')).toEqual({
      OR: [{ assignedToId: null }, { assignedToId: 'fictional-ops' }],
    })
  })
})
