import { VehicleInspectionStatus, type VehicleCheckResult } from '@prisma/client'
import { assessVehicleInspection, vehicleConditionChecks } from './checklist'

export type ReportCheck = { code: string; result: VehicleCheckResult; remarks: string | null }
export function isFinalInspection(status: VehicleInspectionStatus) {
  return status === VehicleInspectionStatus.APPROVED || status === VehicleInspectionStatus.REJECTED
}

/** Canonical order, not arbitrary persisted category/label strings. */
export function buildInspectionReportChecks(checks: ReportCheck[]) {
  const saved = new Map(checks.map((check) => [check.code, check]))
  return vehicleConditionChecks.map((def) => ({
    code: def.code, label: def.label, category: def.category, critical: def.critical,
    result: saved.get(def.code)?.result ?? 'NOT_CHECKED',
    remarks: saved.get(def.code)?.remarks ?? null,
  }))
}

export function reportSummary(checks: ReportCheck[]) {
  const assessment = assessVehicleInspection(checks)
  return { total: assessment.total, completed: assessment.completed,
    failures: assessment.failures.length, criticalFailures: assessment.criticalFailures.length }
}
