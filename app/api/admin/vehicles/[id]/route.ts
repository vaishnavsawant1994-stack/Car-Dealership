import { NextResponse } from 'next/server'
import { adminError, conflictError, validationError } from '@/lib/admin/api'
import { writeAuditLog } from '@/lib/admin/audit'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { getActorShowroomScope } from '@/lib/auth/showroom-scope'
import { showroomScopeWhere } from '@/lib/auth/admin-resource-policy'
import { prisma } from '@/lib/db/prisma'
import { vehicleAdminSchema } from '@/lib/validation/admin'

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await authorizeAdminRequest('vehicle.view')
    const scope = await getActorShowroomScope(actor)
    const { id } = await context.params
    const vehicle = await prisma.vehicle.findFirst({ where: { id, ...showroomScopeWhere(scope) }, include: { brand: true, bodyType: true, images: { orderBy: { sortOrder: 'asc' } }, features: { include: { feature: true } }, statusHistory: { orderBy: { createdAt: 'desc' }, include: { actor: { select: { name: true } } } } } })
    if (!vehicle) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Vehicle not found.' } }, { status: 404 })
    return NextResponse.json({ data: vehicle })
  } catch (error) { return adminError(error) }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await authorizeAdminRequest('vehicle.update')
    const scope = await getActorShowroomScope(actor)
    const { id } = await context.params
    const parsed = vehicleAdminSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors)
    const current = await prisma.vehicle.findFirst({ where: { id, ...showroomScopeWhere(scope) }, select: { id: true, slug: true, published: true, version: true, stockNumber: true } })
    if (!current) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Vehicle not found.' } }, { status: 404 })
    if (current.version !== parsed.data.version) return conflictError()
    const { featureIds, version, status: _, ...data } = parsed.data
    const duplicate = await prisma.vehicle.findFirst({ where: { id: { not: id }, OR: [{ slug: data.slug }, { stockNumber: data.stockNumber }] }, select: { id: true } })
    if (duplicate) return NextResponse.json({ error: { code: 'DUPLICATE_VEHICLE', message: 'The stock number or slug is already in use.' } }, { status: 409 })
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.vehicle.updateMany({ where: { id, version, ...showroomScopeWhere(scope) }, data: { ...data, version: { increment: 1 }, updatedById: actor.id } })
      if (!result.count) return null
      await tx.vehicleFeature.deleteMany({ where: { vehicleId: id } })
      if (featureIds.length) await tx.vehicleFeature.createMany({ data: featureIds.map((featureId) => ({ vehicleId: id, featureId })) })
      if (current.published && current.slug !== data.slug) await tx.vehicleSlugRedirect.upsert({ where: { fromSlug: current.slug }, update: { toSlug: data.slug, vehicleId: id }, create: { vehicleId: id, fromSlug: current.slug, toSlug: data.slug } })
      return tx.vehicle.findUniqueOrThrow({ where: { id } })
    })
    if (!updated) return conflictError()
    await writeAuditLog({ actorId: actor.id, action: 'VEHICLE_UPDATED', resourceType: 'Vehicle', resourceId: id, summary: `Updated ${updated.stockNumber}.`, metadata: { changedSlug: current.slug !== updated.slug }, request })
    return NextResponse.json({ data: updated, message: 'Vehicle updated.' })
  } catch (error) { return adminError(error) }
}
