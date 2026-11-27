import { RequestStatus } from '@prisma/client'

export const inspectableIntakeStatuses = [
  RequestStatus.UNDER_REVIEW, RequestStatus.CONTACTED,
  RequestStatus.INSPECTION_SCHEDULED, RequestStatus.INSPECTION_COMPLETED,
  RequestStatus.INSPECTED,
] as const

export type IntakeInspection = {
  exteriorScore: number | null
  interiorScore: number | null
  mechanicalScore: number | null
  overallConditionScore: number | null
  documentsVerified: boolean
  serviceHistoryVerified: boolean
  completedAt: Date | null
}

export type InspectionReadiness = {
  ready: boolean
  finalized: boolean
  overallScore: number | null
  missing: string[]
  advisories: string[]
}

/** Pure readiness assessment of the canonical SellInspection; no status writes. */
export function assessInspectionReadiness(inspection: IntakeInspection | null): InspectionReadiness {
  if (!inspection) {
    return { ready: false, finalized: false, overallScore: null,
      missing: ['Exterior score', 'Interior score', 'Mechanical score', 'Overall score', 'Documents verification'],
      advisories: ['No inspection record yet.'] }
  }
  const required: Array<[string, boolean]> = [
    ['Exterior score', inspection.exteriorScore != null && inspection.exteriorScore >= 1 && inspection.exteriorScore <= 10],
    ['Interior score', inspection.interiorScore != null && inspection.interiorScore >= 1 && inspection.interiorScore <= 10],
    ['Mechanical score', inspection.mechanicalScore != null && inspection.mechanicalScore >= 1 && inspection.mechanicalScore <= 10],
    ['Overall score', inspection.overallConditionScore != null && inspection.overallConditionScore >= 1 && inspection.overallConditionScore <= 10],
    ['Documents verification', inspection.documentsVerified],
  ]
  const missing = required.filter(([, done]) => !done).map(([label]) => label)
  const advisories = [
    ...(!inspection.serviceHistoryVerified ? ['Service history not yet verified.'] : []),
    ...(missing.length === 0 && !inspection.completedAt ? ['Inspection has not been finalized.'] : []),
    ...(missing.length > 0 && inspection.completedAt ? ['Recorded completion is missing required evidence.'] : []),
  ]
  return { ready: missing.length === 0, finalized: missing.length === 0 && Boolean(inspection.completedAt),
    overallScore: inspection.overallConditionScore, missing, advisories }
}
