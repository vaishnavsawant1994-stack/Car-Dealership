import { Download, Plus } from 'lucide-react'
import Link from 'next/link'
import { Prisma, VehicleStatus } from '@prisma/client'
import { AdminPageHeader, AdminPagination } from '@/components/admin/AdminPrimitives'
import { VehicleListClient } from '@/components/admin/VehicleListClient'
import { hasPermission } from '@/lib/auth/admin-permissions'
import { requirePermission } from '@/lib/auth/require-permission'
import { prisma } from '@/lib/db/prisma'
import { getActorShowroomScope } from '@/lib/auth/showroom-scope'
import { showroomScopeWhere } from '@/lib/auth/admin-resource-policy'

export default async function AdminVehiclesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requirePermission('vehicle.view', '/admin/vehicles')
  const showroom = showroomScopeWhere(await getActorShowroomScope(actor))
  const query = await searchParams; const page = Math.max(1, Number(query.page) || 1); const pageSize = 20
  const status = Object.values(VehicleStatus).includes(query.status as VehicleStatus) ? query.status as VehicleStatus : undefined
  const where: Prisma.VehicleWhereInput = { ...showroom, ...(status ? { status } : {}), ...(query.brand ? { brandId: query.brand } : {}), ...(query.search ? { OR: [{ stockNumber: { contains: query.search, mode: 'insensitive' } }, { model: { contains: query.search, mode: 'insensitive' } }, { variant: { contains: query.search, mode: 'insensitive' } }, { slug: { contains: query.search, mode: 'insensitive' } }, { brand: { name: { contains: query.search, mode: 'insensitive' } } }] } : {}) }
  const [vehicles, total, brands] = await Promise.all([
    prisma.vehicle.findMany({ where, orderBy: { updatedAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize, include: { brand: { select: { name: true } }, images: { where: { isPrimary: true }, take: 1, select: { url: true, altText: true } }, _count: { select: { images: true, favorites: true } } } }),
    prisma.vehicle.count({ where }), prisma.brand.findMany({ where: { active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ])
  return <><AdminPageHeader title="Vehicle Inventory" text={`${total} database-backed vehicles. Filters and pagination run on the server.`} breadcrumb="Vehicles" actions={<><Link className="admin-button admin-button--secondary" href="/api/admin/exports/vehicles"><Download />Export CSV</Link>{hasPermission(actor.role, 'vehicle.create') ? <Link className="admin-button" href="/admin/vehicles/new"><Plus />New vehicle</Link> : null}</>} />
    <form className="admin-filterbar"><label className="admin-filterbar__search">Search<input name="search" defaultValue={query.search} placeholder="Stock, brand, model, variant or slug" /></label><label>Status<select name="status" defaultValue={status ?? ''}><option value="">All statuses</option>{Object.values(VehicleStatus).map((item) => <option key={item}>{item}</option>)}</select></label><label>Brand<select name="brand" defaultValue={query.brand ?? ''}><option value="">All brands</option>{brands.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><button className="admin-button admin-button--secondary">Apply filters</button>{query.search || query.status || query.brand ? <Link className="admin-button admin-button--secondary" href="/admin/vehicles">Clear</Link> : null}</form>
    <VehicleListClient rows={vehicles.map((item) => ({ ...item, updatedAt: item.updatedAt.toISOString() }))} canUpdate={hasPermission(actor.role, 'vehicle.update')} canPublish={hasPermission(actor.role, 'vehicle.publish')} canArchive={hasPermission(actor.role, 'vehicle.archive')} />
    <AdminPagination page={page} totalPages={Math.max(1, Math.ceil(total / pageSize))} basePath="/admin/vehicles" params={{ search: query.search, status: query.status, brand: query.brand }} />
  </>
}
