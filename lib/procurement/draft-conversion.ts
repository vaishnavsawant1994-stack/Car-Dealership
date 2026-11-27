import { RequestStatus } from '@prisma/client'
import { z } from 'zod'
import { vehicleAdminSchema } from '@/lib/validation/admin'

export const convertProcurementSchema = z.object({
  version: z.number().int().positive(),
  vehicle: vehicleAdminSchema,
}).strict()

export type ConvertProcurementInput = z.output<typeof convertProcurementSchema>

export type ProcurementConversionEvidence = {
  status: RequestStatus
  inspection: { completedAt: Date | null; documentsVerified: boolean; overallConditionScore: number | null } | null
  valuations: Array<{ finalOffer: number | null }>
}

export function assessProcurementDraftEligibility(source: ProcurementConversionEvidence) {
  const missing: string[] = []
  if (source.status !== RequestStatus.COMPLETED) missing.push('Acquisition must be confirmed complete.')
  if (!source.inspection?.completedAt || !source.inspection.documentsVerified ||
      source.inspection.overallConditionScore == null || source.inspection.overallConditionScore < 1 ||
      source.inspection.overallConditionScore > 10) {
    missing.push('A completed, documented vehicle inspection is required.')
  }
  if (!source.valuations.some((valuation) => valuation.finalOffer != null && valuation.finalOffer > 0)) {
    missing.push('A recorded final acquisition offer is required.')
  }
  return { eligible: missing.length === 0, missing }
}
