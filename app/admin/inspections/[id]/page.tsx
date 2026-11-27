import { UserRole } from '@prisma/client'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AdminPageHeader, AdminStatus } from '@/components/admin/AdminPrimitives'
import { InspectionWorkspace } from '@/components/admin/InspectionWorkspace'
import { InspectionEvidenceManager } from '@/components/admin/InspectionEvidenceManager'
import { requirePermission } from '@/lib/auth/require-permission'
import { prisma } from '@/lib/db/prisma'
import { vehicleConditionChecks, assessVehicleInspection } from '@/lib/inspection/checklist'
import { canEditVehicleInspection, canReviewVehicleInspection } from '@/lib/inspection/inspection-service'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePermission('vehicle.update')
  const { id } = await params
  const inspection = await prisma.vehicleInspection.findUnique({
    where: { id },
    select: {
      id: true, status: true, version: true, inspectorId: true, reviewerId: true,
      reviewNote: true, submittedAt: true, reviewedAt: true, createdAt: true,
      vehicle: { select: { id: true, shortTitle: true, stockNumber: true } },
      inspector: { select: { name: true } }, reviewer: { select: { name: true } },
      checks: { select: { code: true, category: true, result: true, remarks: true } },
      evidence: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], select: { id: true, checkCode: true, originalName: true, mimeType: true, sizeBytes: true, createdAt: true } },
    },
  })
  if (!inspection || !canEditVehicleInspection(actor, inspection.inspectorId)) notFound()
  const checks = vehicleConditionChecks.map((definition) => {
    const saved = inspection.checks.find((row) => row.code === definition.code)
    return { code: definition.code, category: definition.category, label: definition.label,
      critical: definition.critical, result: saved?.result ?? 'NOT_CHECKED', remarks: saved?.remarks ?? '' }
  })
  const assessment = assessVehicleInspection(inspection.checks)
  const canReview = canReviewVehicleInspection(actor, inspection.inspectorId) &&
    (actor.role === UserRole.ADMIN || actor.role === UserRole.SUPER_ADMIN)
  return <>
    <AdminPageHeader title={`Inspection: ${inspection.vehicle.stockNumber}`}
      text={inspection.vehicle.shortTitle}
      breadcrumb="Vehicle Inspections / Details"
      actions={<><AdminStatus value={inspection.status}/><Link href="/admin/inspections" className="admin-button admin-button--secondary">All inspections</Link>{inspection.status === 'APPROVED' || inspection.status === 'REJECTED' ? <Link href={`/admin/inspections/${inspection.id}/report`} className="admin-button">Final report</Link> : null}</>} />
    <InspectionWorkspace
      key={inspection.version}
      inspectionId={inspection.id}
      version={inspection.version}
      status={inspection.status}
      checks={checks}
      assessment={assessment}
      canEdit={canEditVehicleInspection(actor, inspection.inspectorId)}
      canReview={canReview}
      inspectorName={inspection.inspector.name ?? 'Staff member'}
      reviewerName={inspection.reviewer?.name ?? null}
      reviewNote={inspection.reviewNote ?? ''}
    />
    <InspectionEvidenceManager
      key={'evidence-' + inspection.version}
      inspectionId={inspection.id}
      version={inspection.version}
      status={inspection.status}
      checks={vehicleConditionChecks.map((item) => ({ code: item.code, category: item.category, label: item.label }))}
      initialEvidence={inspection.evidence.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() }))}
    />
  </>
}
