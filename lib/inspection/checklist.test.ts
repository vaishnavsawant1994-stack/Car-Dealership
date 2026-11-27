import { UserRole, VehicleCheckResult } from '@prisma/client'
import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
import { assessVehicleInspection, vehicleConditionChecks } from './checklist'
import { canEditVehicleInspection, canReviewVehicleInspection } from './inspection-service'

const complete = vehicleConditionChecks.map((item) => ({
  code: item.code, result: VehicleCheckResult.PASS, remarks: null,
}))

describe('P3-01 vehicle condition inspection contracts', () => {
  it('has a unique, categorized checklist with critical safety items', () => {
    expect(vehicleConditionChecks).toHaveLength(43)
    expect(new Set(vehicleConditionChecks.map((item) => item.code)).size).toBe(43)
    expect(new Set(vehicleConditionChecks.map((item) => item.category)).size).toBe(6)
    expect(vehicleConditionChecks.some((item) => item.critical && item.label === 'Brake system')).toBe(true)
  })
  it('requires all 43 results before submission', () => {
    const result = assessVehicleInspection(complete.slice(0, 42))
    expect(result.completed).toBe(42)
    expect(result.unchecked).toHaveLength(1)
    expect(result.canSubmit).toBe(false)
    expect(result.canApprove).toBe(false)
  })
  it('requires remarks on failures and blocks approval until they are resolved', () => {
    const failed = complete.map((item, i) => i === 0 ? { ...item, result: VehicleCheckResult.FAIL } : item)
    const first = assessVehicleInspection(failed)
    expect(first.missingRemarks).toHaveLength(1)
    expect(first.canSubmit).toBe(false)
    expect(first.canApprove).toBe(false)
    const documented = assessVehicleInspection(failed.map((item, i) => i === 0 ? { ...item, remarks: 'VIN requires clarification.' } : item))
    expect(documented.canSubmit).toBe(true)
    expect(documented.canApprove).toBe(false)
    expect(documented.criticalFailures).toContain(vehicleConditionChecks[0].code)
  })
  it('allows all-pass or non-applicable results to proceed to independent review', () => {
    const result = assessVehicleInspection(complete.map((item, i) => i === 4 ? { ...item, result: VehicleCheckResult.NOT_APPLICABLE } : item))
    expect(result.canSubmit).toBe(true)
    expect(result.canApprove).toBe(true)
    expect(result.completed).toBe(43)
  })
  it('requires the reviewer to have administrator authority and be a different user', () => {
    const inspector = { id: 'ops-1', role: UserRole.OPERATIONS }
    const admin = { id: 'admin-1', role: UserRole.ADMIN }
    expect(canEditVehicleInspection(inspector, 'ops-1')).toBe(true)
    expect(canEditVehicleInspection(inspector, 'ops-2')).toBe(false)
    expect(canEditVehicleInspection(admin, 'ops-2')).toBe(true)
    expect(canReviewVehicleInspection(admin, 'ops-1')).toBe(true)
    expect(canReviewVehicleInspection(inspector, 'ops-2')).toBe(false)
    expect(canReviewVehicleInspection(admin, 'admin-1')).toBe(false)
  })
})
