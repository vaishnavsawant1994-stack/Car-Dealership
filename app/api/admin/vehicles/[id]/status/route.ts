import { VehicleStatus } from '@prisma/client'
import { NextResponse } from 'next/server'
import { adminError, conflictError, validationError } from '@/lib/admin/api'
import { writeAuditLog } from '@/lib/admin/audit'
import { canTransitionVehicle, statusTransitionNeedsReason } from '@/lib/admin/vehicle-workflow'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { getActorShowroomScope } from '@/lib/auth/showroom-scope'
import { showroomScopeWhere } from '@/lib/auth/admin-resource-policy'
import { prisma } from '@/lib/db/prisma'
import { vehicleStatusSchema } from '@/lib/validation/admin'

const permissions = { RESERVED: 'vehicle.reserve', SOLD: 'vehicle.markSold', ARCHIVED: 'vehicle.archive', AVAILABLE: 'vehicle.update', DRAFT: 'vehicle.update' } as const

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const body = await request.json().catch(() => null)
    const parsed = vehicleStatusSchema.safeParse(body)
    if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors)
    const actor = await authorizeAdminRequest(permissions[parsed.data.status])
    const scope = await getActorShowroomScope(actor)
    const { id } = await context.params
    const current = await prisma.vehicle.findFirst({ where: { id, ...showroomScopeWhere(scope) }, select: { status: true, version: true, stockNumber: true, published: true } })
    if (!current) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Vehicle not found.' } }, { status: 404 })
    if (current.version !== parsed.data.version) return conflictError()
    if (!canTransitionVehicle(current.status, parsed.data.status)) return NextResponse.json({ error: { code: 'INVALID_TRANSITION', message: `${current.status} cannot transition to ${parsed.data.status}.` } }, { status: 422 })
    if (statusTransitionNeedsReason(current.status, parsed.data.status) && (!parsed.data.reason || parsed.data.reason.length < 5)) return NextResponse.json({ error: { code: 'REASON_REQUIRED', message: 'Provide a reason for this status change.' } }, { status: 400 })
    const vehicle = await prisma.$transaction(async (tx) => {
      const result = await tx.vehicle.updateMany({ where: { id, version: parsed.data.version, ...showroomScopeWhere(scope) }, data: { status: parsed.data.status, featured: parsed.data.status === VehicleStatus.SOLD || parsed.data.status === VehicleStatus.ARCHIVED ? false : undefined, published: parsed.data.status === VehicleStatus.ARCHIVED ? false : undefined, updatedById: actor.id, version: { increment: 1 } } })
      if (!result.count) return null
      await tx.vehicleStatusHistory.create({ data: { vehicleId: id, fromStatus: current.status, toStatus: parsed.data.status, reason: parsed.data.reason, actorId: actor.id } })
      return tx.vehicle.findUniqueOrThrow({ where: { id } })
    })
    if (!vehicle) return conflictError()
    await writeAuditLog({ actorId: actor.id, action: 'VEHICLE_STATUS_CHANGED', resourceType: 'Vehicle', resourceId: id, summary: `${current.stockNumber}: ${current.status} to ${parsed.data.status}.`, metadata: { reason: parsed.data.reason }, request })
    return NextResponse.json({ data: vehicle, message: 'Vehicle status updated.' })
  } catch (error) { return adminError(error) }
}
