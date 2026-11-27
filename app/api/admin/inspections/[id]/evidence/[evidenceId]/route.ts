import { NextResponse } from 'next/server'
import { adminError } from '@/lib/admin/api'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { prisma } from '@/lib/db/prisma'
import { canEditVehicleInspection } from '@/lib/inspection/inspection-service'
import { readInspectionEvidence } from '@/lib/storage/inspection-evidence-storage'

export async function GET(_: Request, { params }: { params: Promise<{ id: string; evidenceId: string }> }) {
  try {
    const actor = await authorizeAdminRequest('vehicle.update')
    const { id, evidenceId } = await params
    const inspection = await prisma.vehicleInspection.findUnique({
      where: { id }, select: { inspectorId: true },
    })
    if (!inspection || !canEditVehicleInspection(actor, inspection.inspectorId)) {
      return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })
    }
    const evidence = await prisma.vehicleInspectionEvidence.findFirst({
      where: { id: evidenceId, inspectionId: id },
      select: { id: true, originalName: true, mimeType: true, sizeBytes: true, storageKey: true },
    })
    if (!evidence) return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })
    const bytes = await readInspectionEvidence(evidence.storageKey)
    const filename = evidence.originalName.replace(/["\r\n\\]/g, '_')
    return new NextResponse(new Uint8Array(bytes), { headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(bytes.length),
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    } })
  } catch (error) { return adminError(error) }
}
