import { NextResponse } from 'next/server'
import { z } from 'zod'
import { adminError, validationError } from '@/lib/admin/api'
import { writeAuditLog } from '@/lib/admin/audit'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { getActorShowroomScope } from '@/lib/auth/showroom-scope'
import { showroomScopeWhere } from '@/lib/auth/admin-resource-policy'
import { prisma } from '@/lib/db/prisma'

const schema = z.object({ reason: z.string().trim().min(5).max(500) })
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await authorizeAdminRequest('vehicle.publish')
    const scope = await getActorShowroomScope(actor)
    const parsed = schema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors)
    const { id } = await context.params
    const result = await prisma.vehicle.updateMany({ where: { id, ...showroomScopeWhere(scope) }, data: { published: false, updatedById: actor.id, version: { increment: 1 } } })
    if (!result.count) return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })
    const vehicle = await prisma.vehicle.findFirstOrThrow({ where: { id, ...showroomScopeWhere(scope) } })
    await writeAuditLog({ actorId: actor.id, action: 'VEHICLE_UNPUBLISHED', resourceType: 'Vehicle', resourceId: id, summary: `Unpublished ${vehicle.stockNumber}.`, metadata: { reason: parsed.data.reason }, request })
    return NextResponse.json({ data: vehicle, message: 'Vehicle unpublished.' })
  } catch (error) { return adminError(error) }
}
