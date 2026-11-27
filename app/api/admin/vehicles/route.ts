import { Prisma, VehicleStatus } from '@prisma/client'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { adminError, validationError } from '@/lib/admin/api'
import { writeAuditLog } from '@/lib/admin/audit'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { getActorShowroomScope, primaryShowroomId } from '@/lib/auth/showroom-scope'
import { showroomScopeWhere } from '@/lib/auth/admin-resource-policy'
import { prisma } from '@/lib/db/prisma'
import { vehicleAdminSchema } from '@/lib/validation/admin'

const querySchema = z.object({
  search: z.string().trim().max(120).optional(), status: z.enum(VehicleStatus).optional(), brandId: z.string().optional(), published: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().positive().catch(1), pageSize: z.coerce.number().int().min(10).max(100).catch(20), sort: z.enum(['updated', 'created', 'price-asc', 'price-desc']).catch('updated'),
})

export async function GET(request: Request) {
  try {
    const actor = await authorizeAdminRequest('vehicle.view')
    const scope = await getActorShowroomScope(actor)
    const query = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams))
    const where: Prisma.VehicleWhereInput = {
      ...showroomScopeWhere(scope),
      ...(query.status ? { status: query.status } : {}), ...(query.brandId ? { brandId: query.brandId } : {}), ...(query.published ? { published: query.published === 'true' } : {}),
      ...(query.search ? { OR: [{ stockNumber: { contains: query.search, mode: 'insensitive' } }, { model: { contains: query.search, mode: 'insensitive' } }, { variant: { contains: query.search, mode: 'insensitive' } }, { slug: { contains: query.search, mode: 'insensitive' } }, { registrationNumberMasked: { contains: query.search, mode: 'insensitive' } }, { brand: { name: { contains: query.search, mode: 'insensitive' } } }] } : {}),
    }
    const orderBy: Prisma.VehicleOrderByWithRelationInput = query.sort === 'created' ? { createdAt: 'desc' } : query.sort === 'price-asc' ? { price: 'asc' } : query.sort === 'price-desc' ? { price: 'desc' } : { updatedAt: 'desc' }
    const [items, total] = await Promise.all([prisma.vehicle.findMany({ where, orderBy, skip: (query.page - 1) * query.pageSize, take: query.pageSize, include: { brand: true, bodyType: true, images: { where: { isPrimary: true }, take: 1 }, _count: { select: { images: true, favorites: true } } } }), prisma.vehicle.count({ where })])
    return NextResponse.json({ data: items, pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.max(1, Math.ceil(total / query.pageSize)) } })
  } catch (error) { return adminError(error) }
}

export async function POST(request: Request) {
  try {
    const actor = await authorizeAdminRequest('vehicle.create')
    const scope = await getActorShowroomScope(actor)
    const parsed = vehicleAdminSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors)
    const { featureIds, version: _, status: __, ...data } = parsed.data
    const showroomId = scope.global ? await primaryShowroomId() : scope.showroomIds[0]
    if (!showroomId) return NextResponse.json({ error: { code: 'SHOWROOM_REQUIRED', message: 'Assign this account to an active showroom before creating inventory.' } }, { status: 422 })
    const duplicate = await prisma.vehicle.findFirst({ where: { OR: [{ slug: data.slug }, { stockNumber: data.stockNumber }] }, select: { slug: true, stockNumber: true } })
    if (duplicate) return NextResponse.json({ error: { code: 'DUPLICATE_VEHICLE', message: duplicate.slug === data.slug ? 'This slug is already in use.' : 'This stock number is already in use.' } }, { status: 409 })
    const vehicle = await prisma.$transaction(async (tx) => {
      const created = await tx.vehicle.create({ data: { ...data, showroomId, status: VehicleStatus.DRAFT, published: false, createdById: actor.id, updatedById: actor.id } })
      if (featureIds.length) await tx.vehicleFeature.createMany({ data: featureIds.map((featureId) => ({ vehicleId: created.id, featureId })) })
      return created
    })
    await writeAuditLog({ actorId: actor.id, action: 'VEHICLE_CREATED', resourceType: 'Vehicle', resourceId: vehicle.id, summary: `Created draft vehicle ${vehicle.stockNumber}.`, metadata: { slug: vehicle.slug }, request })
    return NextResponse.json({ data: vehicle, message: 'Draft vehicle created.' }, { status: 201 })
  } catch (error) { return adminError(error) }
}
