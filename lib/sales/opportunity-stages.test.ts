import { InquiryStatus, TestDriveStatus, UserRole } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import {
  emptySalesStageCounts, inquiryStage, inquiryStatusesForStage, parseSalesFilters,
  salesAssignmentScope, salesStages, testDriveStage, testDriveStatusesForStage,
} from './opportunity-stages'

describe('P5-01 canonical sales opportunity grouping', () => {
  it('maps every existing inquiry and test-drive state exactly once', () => {
    expect(Object.keys(inquiryStage).sort()).toEqual(Object.values(InquiryStatus).sort())
    expect(Object.keys(testDriveStage).sort()).toEqual(Object.values(TestDriveStatus).sort())
    expect(inquiryStage[InquiryStatus.WAITING_FOR_CUSTOMER]).toBe('engaged')
    expect(testDriveStage[TestDriveStatus.CONFIRMED]).toBe('scheduled')
    expect(testDriveStage[TestDriveStatus.COMPLETED]).toBe('completed')
    expect(testDriveStage[TestDriveStatus.NO_SHOW]).toBe('lost')
    expect(salesStages).toEqual(Object.keys(emptySalesStageCounts()))
  })

  it('supports only known filter and assignment values', () => {
    expect(parseSalesFilters({ stage: 'scheduled', assignment: 'mine' })).toEqual({
      stage: 'scheduled', assignment: 'mine',
    })
    expect(parseSalesFilters({ stage: 'DROP TABLE', assignment: 'all-staff' })).toEqual({
      stage: null, assignment: 'all',
    })
    expect(inquiryStatusesForStage('scheduled')).toEqual([])
    expect(testDriveStatusesForStage('scheduled')).toEqual([
      TestDriveStatus.CONFIRMED, TestDriveStatus.RESCHEDULE_REQUESTED, TestDriveStatus.RESCHEDULED,
    ])
  })

  it('never gives sales staff access to a different assigned lead by default', () => {
    const staff = { id: 'sales-a', role: UserRole.SALES }
    expect(salesAssignmentScope(staff, 'all')).toEqual({
      OR: [{ assignedToId: null }, { assignedToId: 'sales-a' }],
    })
    expect(salesAssignmentScope(staff, 'mine')).toEqual({ assignedToId: 'sales-a' })
    expect(salesAssignmentScope(staff, 'unassigned')).toEqual({ assignedToId: null })
  })

  it('gives managers an all-opportunity view but preserves explicit filters', () => {
    const actor = { id: 'admin-a', role: UserRole.ADMIN }
    expect(salesAssignmentScope(actor, 'all')).toEqual({})
    expect(salesAssignmentScope(actor, 'mine')).toEqual({ assignedToId: 'admin-a' })
    expect(salesAssignmentScope(actor, 'unassigned')).toEqual({ assignedToId: null })
  })
})
