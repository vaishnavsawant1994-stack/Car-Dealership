import { NextResponse } from 'next/server'
import { z } from 'zod'
import { validationError } from '@/lib/admin/api'
import { catalogError } from '@/lib/admin/catalog-error'
import { writeAuditLog } from '@/lib/admin/audit'
import { catalogSchemas as schemas, isCatalogResource, resourcePermissions } from '@/lib/admin/catalog'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { prisma } from '@/lib/db/prisma'

export async function GET(_: Request, context: { params: Promise<{ resource: string }> }) {
  try { const { resource } = await context.params; if (!isCatalogResource(resource)) return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 }); const permission = resourcePermissions[resource]; await authorizeAdminRequest(permission); const data = resource === 'brands' ? await prisma.brand.findMany({ orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }], include: { _count: { select: { vehicles: true } } } }) : resource === 'body-types' ? await prisma.bodyType.findMany({ orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }], include: { _count: { select: { vehicles: true } } } }) : await prisma.feature.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }], include: { _count: { select: { vehicles: true } } } }); return NextResponse.json({ data }) } catch (error) { return catalogError(error) }
}

export async function POST(request: Request, context: { params: Promise<{ resource: string }> }) {
  try {
    const { resource } = await context.params
    if (!isCatalogResource(resource)) return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })
    const permission = resourcePermissions[resource]; const schema = schemas[resource]
    const actor = await authorizeAdminRequest(permission); const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors)
    const data = resource === 'brands' ? await prisma.brand.create({ data: parsed.data as z.infer<typeof schemas.brands> }) : resource === 'body-types' ? await prisma.bodyType.create({ data: parsed.data as z.infer<typeof schemas['body-types']> }) : await prisma.feature.create({ data: parsed.data as z.infer<typeof schemas.features> })
    await writeAuditLog({ actorId: actor.id, action: `${resource.toUpperCase()}_CREATED`, resourceType: resource, resourceId: data.id, summary: `Created ${parsed.data.name}.`, request })
    return NextResponse.json({ data, message: 'Catalog record created.' }, { status: 201 })
  } catch (error) { return catalogError(error) }
}
