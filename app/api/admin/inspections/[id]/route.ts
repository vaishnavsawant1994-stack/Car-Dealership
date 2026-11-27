import { NextResponse } from 'next/server'
import { adminError } from '@/lib/admin/api'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { getActorShowroomScope } from '@/lib/auth/showroom-scope'
import { inspectionShowroomWhere } from '@/lib/auth/admin-resource-policy'
import { prisma } from '@/lib/db/prisma'
import { canEditVehicleInspection } from '@/lib/inspection/inspection-service'

/** Full report is private staff material; deny access to other operators' inspections. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await authorizeAdminRequest('vehicle.update')
    const { id } = await params
    const scopeWhere = inspectionShowroomWhere(await getActorShowroomScope(actor))
    const inspection = await prisma.vehicleInspection.findFirst({
      where: { id, ...scopeWhere },
      select: {
        id: true, vehicleId: true, inspectorId: true, reviewerId: true,
        status: true, version: true, reviewNote: true,
        submittedAt: true, reviewedAt: true, createdAt: true, updatedAt: true,
        vehicle: { select: { id: true, shortTitle: true, stockNumber: true, status: true, published: true } },
        inspector: { select: { id: true, name: true } },
        reviewer: { select: { name: true } },
        checks: { orderBy: [{ category: 'asc' }, { code: 'asc' }], select: {
          code: true, category: true, result: true, remarks: true, updatedAt: true,
        } },
      },
    })
    if (!inspection || !canEditVehicleInspection(actor, inspection.inspectorId)) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Inspection not found.' } }, { status: 404 })
    }
    return NextResponse.json({ data: inspection }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    return adminError(error)
  }
}

