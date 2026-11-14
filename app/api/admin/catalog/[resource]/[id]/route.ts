import { NextResponse } from 'next/server'
import { validationError } from '@/lib/admin/api'
import { catalogError } from '@/lib/admin/catalog-error'
import { writeAuditLog } from '@/lib/admin/audit'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { prisma } from '@/lib/db/prisma'
import { catalogSchemas as schemas, isCatalogResource, resourcePermissions } from '@/lib/admin/catalog'

export async function PATCH(request: Request, context: { params: Promise<{ resource: string; id: string }> }) {
  try {
    const { resource, id } = await context.params
    if (!isCatalogResource(resource)) return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })
    const permission = resourcePermissions[resource]; const schema = schemas[resource]
    const actor = await authorizeAdminRequest(permission); const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors)
    const data = resource === 'brands' ? await prisma.brand.update({ where: { id }, data: parsed.data }) : resource === 'body-types' ? await prisma.bodyType.update({ where: { id }, data: parsed.data }) : await prisma.feature.update({ where: { id }, data: parsed.data })
    await writeAuditLog({ actorId: actor.id, action: `${resource.toUpperCase()}_UPDATED`, resourceType: resource, resourceId: id, summary: `Updated ${parsed.data.name}.`, request })
    return NextResponse.json({ data, message: 'Catalog record updated.' })
  } catch (error) { return catalogError(error) }
}

export async function DELETE(request: Request, context: { params: Promise<{ resource: string; id: string }> }) {
  try {
    const { resource, id } = await context.params
    if (!isCatalogResource(resource)) return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })
    const permission = resourcePermissions[resource]
    const actor = await authorizeAdminRequest(permission)
    const count = resource === 'brands' ? await prisma.vehicle.count({ where: { brandId: id } }) : resource === 'body-types' ? await prisma.vehicle.count({ where: { bodyTypeId: id } }) : await prisma.vehicleFeature.count({ where: { featureId: id } })
    if (count) return NextResponse.json({ error: { code: 'RESOURCE_IN_USE', message: 'This record is used by vehicles. Deactivate it instead.' } }, { status: 409 })
    if (resource === 'brands') await prisma.brand.delete({ where: { id } }); else if (resource === 'body-types') await prisma.bodyType.delete({ where: { id } }); else await prisma.feature.delete({ where: { id } })
    await writeAuditLog({ actorId: actor.id, action: `${resource.toUpperCase()}_DELETED`, resourceType: resource, resourceId: id, summary: 'Unused catalog record deleted.', request })
    return NextResponse.json({ message: 'Catalog record deleted.' })
  } catch (error) { return catalogError(error) }
}
