import { VehicleInspectionStatus } from '@prisma/client'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { adminError, conflictError } from '@/lib/admin/api'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { getActorShowroomScope } from '@/lib/auth/showroom-scope'
import { inspectionShowroomWhere } from '@/lib/auth/admin-resource-policy'
import { prisma } from '@/lib/db/prisma'
import { getConditionCheck } from '@/lib/inspection/checklist'
import { canEditVehicleInspection } from '@/lib/inspection/inspection-service'
import { deleteInspectionEvidenceObject, storeInspectionEvidence } from '@/lib/storage/inspection-evidence-storage'

const editable: VehicleInspectionStatus[] = [VehicleInspectionStatus.DRAFT, VehicleInspectionStatus.IN_PROGRESS]

async function accessibleInspection(id: string, actor: { id: string; role: import('@prisma/client').UserRole }) {
  const scopeWhere = inspectionShowroomWhere(await getActorShowroomScope(actor))
  const inspection = await prisma.vehicleInspection.findFirst({
    where: { id, ...scopeWhere },
    select: { id: true, inspectorId: true, status: true, vehicleId: true, version: true,
      _count: { select: { evidence: true } } },
  })
  return inspection && canEditVehicleInspection(actor, inspection.inspectorId)
    ? { ...inspection, scopeWhere }
    : null
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await authorizeAdminRequest('vehicle.update')
    const { id } = await params
    const inspection = await accessibleInspection(id, actor)
    if (!inspection) return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })
    const data = await prisma.vehicleInspectionEvidence.findMany({
      where: { inspectionId: id, inspection: { is: inspection.scopeWhere } }, take: 60,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: { id: true, checkCode: true, originalName: true, mimeType: true,
        sizeBytes: true, checksum: true, createdAt: true, uploadedBy: { select: { name: true } } },
    })
    return NextResponse.json({ data }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return adminError(error) }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await authorizeAdminRequest('vehicle.update')
    const { id } = await params
    const inspection = await accessibleInspection(id, actor)
    if (!inspection) return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })
    if (!editable.includes(inspection.status)) {
      return NextResponse.json({ error: { code: 'INSPECTION_LOCKED', message: 'Evidence is immutable after submission.' } }, { status: 409 })
    }
    if (inspection._count.evidence >= 60) {
      return NextResponse.json({ error: { code: 'EVIDENCE_LIMIT', message: 'Maximum 60 evidence files per inspection.' } }, { status: 422 })
    }
    const form = await request.formData()
    const file = form.get('file')
    const code = form.get('checkCode')
    const version = z.coerce.number().int().positive().safeParse(form.get('version'))
    if (!(file instanceof File) || typeof code !== 'string' || !getConditionCheck(code) || !version.success) {
      return NextResponse.json({ error: { code: 'INVALID_EVIDENCE', message: 'Choose a checklist item, a file and the current inspection version.' } }, { status: 400 })
    }

    // Store privately before the CAS transaction; any failed DB operation
    // deletes the new object, preventing detached orphan uploads.
    const stored = await storeInspectionEvidence(id, file)
    try {
      const outcome = await prisma.$transaction(async (tx) => {
        const claim = await tx.vehicleInspection.updateMany({
          where: { id, version: version.data, status: { in: editable }, ...inspection.scopeWhere },
          data: { version: { increment: 1 } },
        })
        if (!claim.count) return { type: 'conflict' as const }
        const evidence = await tx.vehicleInspectionEvidence.create({
          data: { ...stored, inspectionId: id, checkCode: code, uploadedById: actor.id },
          select: { id: true, checkCode: true, originalName: true, mimeType: true, sizeBytes: true, checksum: true, createdAt: true },
        })
        await tx.auditLog.create({
          data: {
            actorId: actor.id, action: 'VEHICLE_INSPECTION_EVIDENCE_UPLOADED',
            entity: 'VehicleInspection', entityId: id, resourceType: 'Vehicle', resourceId: inspection.vehicleId,
            summary: 'Added private evidence to a vehicle condition inspection.',
            metadata: { evidenceId: evidence.id, checkCode: code, mimeType: stored.mimeType, sizeBytes: stored.sizeBytes },
          },
        })
        return { type: 'created' as const, data: evidence, version: version.data + 1 }
      })
      if (outcome.type === 'conflict') {
        await deleteInspectionEvidenceObject(stored.storageKey)
        return conflictError('Inspection changed or was submitted. Refresh before uploading evidence.')
      }
      return NextResponse.json({ data: outcome.data, version: outcome.version, message: 'Private inspection evidence saved.' }, {
        status: 201, headers: { 'Cache-Control': 'private, no-store' },
      })
    } catch (error) {
      await deleteInspectionEvidenceObject(stored.storageKey).catch(() => undefined)
      throw error
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('INSPECTION_EVIDENCE_')) {
      return NextResponse.json({ error: { code: error.message, message: 'Evidence failed secure file validation.' } }, { status: 422 })
    }
    if (error && typeof error === 'object' && 'code' in error && (error.code === 'P2002' || error.code === 'P2034')) {
      return conflictError('Evidence was already uploaded or the inspection changed.')
    }
    return adminError(error)
  }
}

