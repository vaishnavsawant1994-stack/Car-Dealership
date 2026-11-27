import { VehicleCheckResult, VehicleInspectionStatus } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import { vehicleConditionChecks } from './checklist'
import { buildInspectionReportChecks, isFinalInspection, reportSummary } from './report'

describe('P3-02 private inspection report contract', () => {
  it('exports finalized reviews but not drafts or pending reviews', () => {
    for (const state of [VehicleInspectionStatus.DRAFT, VehicleInspectionStatus.IN_PROGRESS, VehicleInspectionStatus.READY_FOR_REVIEW]) {
      expect(isFinalInspection(state)).toBe(false)
    }
    expect(isFinalInspection(VehicleInspectionStatus.APPROVED)).toBe(true)
    expect(isFinalInspection(VehicleInspectionStatus.REJECTED)).toBe(true)
  })
  it('includes all canonical checks in a stable, original order', () => {
    const given = [
      { code: vehicleConditionChecks[2].code, result: VehicleCheckResult.FAIL, remarks: 'Synthetic fault detected.' },
      { code: vehicleConditionChecks[0].code, result: VehicleCheckResult.PASS, remarks: null },
      { code: 'CUSTOM_FAKE_CHECK', result: VehicleCheckResult.PASS, remarks: null },
    ]
    const report = buildInspectionReportChecks(given)
    expect(report).toHaveLength(43)
    expect(report.map((item) => item.code)).toEqual(vehicleConditionChecks.map((item) => item.code))
    expect(report[0].result).toBe('PASS')
    expect(report[2].result).toBe('FAIL')
    expect(report.some((item) => item.code === 'CUSTOM_FAKE_CHECK')).toBe(false)
    expect(report.every((item) => typeof item.label === 'string' && item.label.length > 0)).toBe(true)
  })
  it('produces explicit failure and critical failure totals without changing the source', () => {
    const input = vehicleConditionChecks.map((item) => ({
      code: item.code, result: VehicleCheckResult.PASS, remarks: null,
    }))
    input[0] = { ...input[0], result: VehicleCheckResult.FAIL, remarks: 'Synthetic registration mismatch.' }
    const report = reportSummary(input)
    expect(report).toEqual({ total: 43, completed: 43, failures: 1, criticalFailures: 1 })
    expect(input[0].result).toBe(VehicleCheckResult.FAIL)
  })
})
