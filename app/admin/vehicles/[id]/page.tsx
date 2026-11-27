import { ExternalLink, Pencil } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AdminPageHeader, AdminStatus } from '@/components/admin/AdminPrimitives'
import { VehicleAdminActions } from '@/components/admin/VehicleAdminActions'
import { VehicleImageManager } from '@/components/admin/VehicleImageManager'
import { getPublicationReadiness } from '@/lib/admin/vehicle-workflow'
import { hasPermission } from '@/lib/auth/admin-permissions'
import { requirePermission } from '@/lib/auth/require-permission'
import { prisma } from '@/lib/db/prisma'
import { getActorShowroomScope } from '@/lib/auth/showroom-scope'
import { showroomScopeWhere } from '@/lib/auth/admin-resource-policy'

export default async function AdminVehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePermission('vehicle.view')
  const showroom = showroomScopeWhere(await getActorShowroomScope(actor))
  const { id } = await params
  const vehicle = await prisma.vehicle.findFirst({ where: { id, ...showroom }, include: { brand: true, bodyType: true, images: { orderBy: { sortOrder: 'asc' } }, features: { include: { feature: true } }, statusHistory: { orderBy: { createdAt: 'desc' }, include: { actor: { select: { name: true } } } } } })
  if (!vehicle) notFound()
  const readiness = getPublicationReadiness(vehicle)
  const vehicleLabel = `${vehicle.year} ${vehicle.brand.name} ${vehicle.model} ${vehicle.variant}`
  return <><AdminPageHeader title={vehicle.shortTitle} text={`${vehicle.stockNumber} · ${vehicle.brand.name} ${vehicle.model} ${vehicle.variant}`} breadcrumb="Vehicles / Detail" actions={<>{hasPermission(actor.role, 'vehicle.update') ? <>
        <Link className="admin-button admin-button--secondary" href={`/admin/inspections?vehicleId=${encodeURIComponent(id)}`}>Inspections</Link>
        <Link className="admin-button admin-button--secondary" href={`/admin/vehicles/${id}/inspections`}>Condition history</Link>
      </> : null}{hasPermission(actor.role, 'vehicle.update') ? <Link className="admin-button admin-button--secondary" href={`/admin/vehicles/${id}/edit`}><Pencil />Edit</Link> : null}{vehicle.published ? <Link className="admin-button admin-button--secondary" href={`/inventory/${vehicle.slug}`} target="_blank"><ExternalLink />Public page</Link> : null}</>} />
    <div className="admin-detail-layout"><div className="admin-detail-stack"><section className="admin-panel"><header><h2>Vehicle summary</h2><AdminStatus value={vehicle.status} /></header><div className="admin-panel__body admin-kv"><div><small>Price</small><strong>₹{vehicle.price.toLocaleString('en-IN')}</strong></div><div><small>Mileage</small><strong>{vehicle.mileage.toLocaleString('en-IN')} km</strong></div><div><small>Body type</small><strong>{vehicle.bodyType.name}</strong></div><div><small>Fuel / transmission</small><strong>{vehicle.fuelType} · {vehicle.transmission}</strong></div><div><small>Publication</small><strong>{vehicle.published ? 'Published' : 'Unpublished'}</strong></div><div><small>Record version</small><strong>{vehicle.version}</strong></div></div></section><VehicleImageManager vehicleId={id} vehicleLabel={vehicleLabel} initialImages={vehicle.images} canEdit={hasPermission(actor.role, 'vehicle.update')} /></div>
      <aside className="admin-detail-stack"><section className="admin-panel"><header><h2>Publication readiness</h2><AdminStatus value={readiness.ready ? 'Ready' : 'Incomplete'} /></header><div className="admin-panel__body"><strong>{readiness.score}% complete</strong><div className="admin-list">{readiness.checks.map((check) => <article key={check.label}><span>{check.label}</span><AdminStatus value={check.passed ? 'Complete' : 'Missing'} /></article>)}</div></div></section><section className="admin-panel"><header><h2>Quick actions</h2></header><div className="admin-panel__body"><VehicleAdminActions id={id} version={vehicle.version} status={vehicle.status} published={vehicle.published} permissions={{ publish: hasPermission(actor.role, 'vehicle.publish'), reserve: hasPermission(actor.role, 'vehicle.reserve'), sold: hasPermission(actor.role, 'vehicle.markSold'), archive: hasPermission(actor.role, 'vehicle.archive') }} /></div></section><section className="admin-panel"><header><h2>Status history</h2></header><div className="admin-panel__body admin-timeline">{vehicle.statusHistory.map((item) => <article key={item.id}><strong>{item.fromStatus ?? 'CREATED'} → {item.toStatus}</strong><p>{item.reason ?? 'No reason required.'}</p><time>{item.actor?.name ?? 'System'} · {item.createdAt.toLocaleString('en-IN')}</time></article>)}</div></section></aside>
    </div>
  </>
}
