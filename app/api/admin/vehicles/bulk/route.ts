import { VehicleStatus } from '@prisma/client'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { adminError, validationError } from '@/lib/admin/api'
import { writeAuditLog } from '@/lib/admin/audit'
import { canTransitionVehicle, getPublicationReadiness } from '@/lib/admin/vehicle-workflow'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { getActorShowroomScope } from '@/lib/auth/showroom-scope'
import { showroomScopeWhere } from '@/lib/auth/admin-resource-policy'
import { prisma } from '@/lib/db/prisma'

const schema = z.object({ ids: z.array(z.string().cuid()).min(1).max(100), action: z.enum(['feature', 'unfeature', 'newArrival', 'removeNewArrival', 'certify', 'uncertify', 'publish', 'unpublish', 'archive']) })
export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors)
    const actor = await authorizeAdminRequest(parsed.data.action === 'publish' || parsed.data.action === 'unpublish' ? 'vehicle.publish' : parsed.data.action === 'archive' ? 'vehicle.archive' : 'vehicle.update')
    const scope = await getActorShowroomScope(actor)
    const vehicles = await prisma.vehicle.findMany({ where: { id: { in: parsed.data.ids }, ...showroomScopeWhere(scope) }, include: { images: { select: { isPrimary: true, category: true } } } })
    const results: Array<{ id: string; ok: boolean; message: string }> = []
    for (const vehicle of vehicles) {
      try {
        if (parsed.data.action === 'publish') { const ready = getPublicationReadiness(vehicle); if (!ready.ready) throw new Error('Vehicle is incomplete.'); await prisma.vehicle.updateMany({ where: { id: vehicle.id, ...showroomScopeWhere(scope) }, data: { published: true, publishedAt: vehicle.publishedAt ?? new Date(), version: { increment: 1 } } }) }
        else if (parsed.data.action === 'archive') { if (!canTransitionVehicle(vehicle.status, VehicleStatus.ARCHIVED)) throw new Error(`${vehicle.status} cannot be archived.`); await prisma.$transaction([prisma.vehicle.updateMany({ where: { id: vehicle.id, ...showroomScopeWhere(scope) }, data: { status: VehicleStatus.ARCHIVED, published: false, featured: false, version: { increment: 1 } } }), prisma.vehicleStatusHistory.create({ data: { vehicleId: vehicle.id, fromStatus: vehicle.status, toStatus: VehicleStatus.ARCHIVED, reason: 'Bulk archive', actorId: actor.id } })]) }
        else { const data = parsed.data.action === 'feature' ? { featured: true } : parsed.data.action === 'unfeature' ? { featured: false } : parsed.data.action === 'newArrival' ? { newArrival: true } : parsed.data.action === 'removeNewArrival' ? { newArrival: false } : parsed.data.action === 'certify' ? { certified: true } : parsed.data.action === 'uncertify' ? { certified: false } : { published: false }; await prisma.vehicle.updateMany({ where: { id: vehicle.id, ...showroomScopeWhere(scope) }, data: { ...data, version: { increment: 1 }, updatedById: actor.id } }) }
        await writeAuditLog({ actorId: actor.id, action: `VEHICLE_BULK_${parsed.data.action.toUpperCase()}`, resourceType: 'Vehicle', resourceId: vehicle.id, summary: `${parsed.data.action} applied to ${vehicle.stockNumber}.`, request })
        results.push({ id: vehicle.id, ok: true, message: 'Updated' })
      } catch (error) { results.push({ id: vehicle.id, ok: false, message: error instanceof Error ? error.message : 'Failed' }) }
    }
    return NextResponse.json({ data: results, summary: { succeeded: results.filter((item) => item.ok).length, failed: results.filter((item) => !item.ok).length } })
  } catch (error) { return adminError(error) }
}
