import 'server-only'
import type { AdminActor } from '@/lib/auth/require-admin'
import { prisma } from '@/lib/db/prisma'
import { canEditVehicleInspection } from './inspection-service'
import { buildInspectionReportChecks, reportSummary } from './report'

/** Explicit, private staff projection without seller, customer, IP, credentials or files. */
export async function getStaffInspectionReport(id: string, actor: AdminActor) {
  const inspection = await prisma.vehicleInspection.findUnique({
    where: { id },
    select: {
      id: true, vehicleId: true, inspectorId: true, status: true, version: true,
      createdAt: true, submittedAt: true, reviewedAt: true, reviewNote: true,
      vehicle: { select: { stockNumber: true, shortTitle: true, year: true, model: true,
        status: true, published: true } },
      inspector: { select: { name: true } },
      reviewer: { select: { name: true } },
      checks: { select: { code: true, result: true, remarks: true } },
    },
  })
  if (!inspection || !canEditVehicleInspection(actor, inspection.inspectorId)) return null
  const { checks, inspectorId: _privateInspectorId, ...publicRecord } = inspection
  return {
    ...publicRecord,
    inspector: { name: inspection.inspector.name ?? 'Staff member' },
    reviewer: inspection.reviewer ? { name: inspection.reviewer.name ?? 'Staff member' } : null,
    checks: buildInspectionReportChecks(checks),
    summary: reportSummary(checks),
  }
}
