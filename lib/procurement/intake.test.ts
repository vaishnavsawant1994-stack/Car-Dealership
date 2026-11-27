import { RequestStatus, UserRole } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import {
  emptyProcurementCounts, parseProcurementFilters, procurementAssignmentScope,
  procurementStageForStatus, procurementStages, procurementWhere,
} from './intake'

describe('P2-01 procurement intake pipeline', () => {
  it('classifies every existing SellRequest status without adding a parallel state machine', () => {
    expect(Object.keys(procurementStageForStatus).sort()).toEqual(Object.values(RequestStatus).sort())
    expect(procurementStageForStatus[RequestStatus.SUBMITTED]).toBe('new')
    expect(procurementStageForStatus[RequestStatus.INSPECTED]).toBe('inspection')
    expect(procurementStageForStatus[RequestStatus.OFFER_MADE]).toBe('valuation')
    expect(procurementStageForStatus[RequestStatus.COMPLETED]).toBe('acquisition')
    expect(procurementStageForStatus[RequestStatus.REJECTED]).toBe('closed')
    expect(procurementStages.map((item) => item.key)).toEqual(Object.keys(emptyProcurementCounts()))
  })

  it('accepts only known stage filters and bounded pages', () => {
    expect(parseProcurementFilters({ stage: 'inspection', assigned: 'mine', page: '2' })).toEqual({
      stage: 'inspection', assigned: 'mine', page: 2,
    })
    expect(parseProcurementFilters({ stage: 'other', assigned: 'someone-else', page: '-1' })).toEqual({
      stage: null, assigned: 'all', page: 1,
    })
    expect(parseProcurementFilters({ stage: 'new', page: '999' }).page).toBe(100)
  })

  it('scopes focused staff to their records and unassigned intake', () => {
    const sales = { id: 'sales-1', role: UserRole.SALES }
    expect(procurementAssignmentScope(sales, 'all')).toEqual({
      OR: [{ assignedToId: null }, { assignedToId: 'sales-1' }],
    })
    expect(procurementAssignmentScope(sales, 'mine')).toEqual({ assignedToId: 'sales-1' })
    expect(procurementAssignmentScope(sales, 'unassigned')).toEqual({ assignedToId: null })
  })

  it('allows global administrators broader counts without bypassing explicit filters', () => {
    const admin = { id: 'admin-1', role: UserRole.ADMIN }
    expect(procurementAssignmentScope(admin, 'all')).toEqual({})
    expect(procurementAssignmentScope(admin, 'unassigned')).toEqual({ assignedToId: null })
    expect(procurementWhere(admin, { stage: 'valuation', assigned: 'all', page: 1 })).toEqual({
      status: { in: [RequestStatus.VALUATION_READY, RequestStatus.OFFER_MADE, RequestStatus.NEGOTIATING] },
    })
  })

  it('retains role scope when a procurement stage filter is applied', () => {
    const operations = { id: 'ops-1', role: UserRole.OPERATIONS }
    expect(procurementWhere(operations, { stage: 'inspection', assigned: 'all', page: 1 })).toEqual({
      OR: [{ assignedToId: null }, { assignedToId: 'ops-1' }],
      status: { in: [RequestStatus.INSPECTION_SCHEDULED, RequestStatus.INSPECTION_COMPLETED, RequestStatus.INSPECTED] },
    })
  })
})
