import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AdminPageHeader } from '@/components/admin/AdminPrimitives'
import { VehicleForm } from '@/components/admin/VehicleForm'
import { canAccessAssignedResource } from '@/lib/auth/admin-resource-policy'
import { requirePermission } from '@/lib/auth/require-permission'
import { prisma } from '@/lib/db/prisma'
import { assessProcurementDraftEligibility } from '@/lib/procurement/draft-conversion'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePermission('vehicle.create')
  await requirePermission('sellRequest.complete')
  await requirePermission('sellRequest.inspect')
  const { id } = await params
  const source = await prisma.sellRequest.findUnique({
    where: { id },
    select: {
      id: true,
      referenceNumber: true,
      version: true,
      status: true,
      assignedToId: true,
      make: true,
      model: true,
      year: true,
      mileage: true,
      inspection: {
        select: { completedAt: true, documentsVerified: true, overallConditionScore: true },
      },
      valuations: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { finalOffer: true },
      },
      procuredVehicle: { select: { id: true } },
    },
  })
  if (!source || !canAccessAssignedResource(actor, source)) notFound()
  const readiness = assessProcurementDraftEligibility(source)

  const [brands, bodyTypes, features] = await Promise.all([
    prisma.brand.findMany({ where: { active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.bodyType.findMany({ where: { active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.feature.findMany({ where: { active: true }, orderBy: [{ category: 'asc' }, { name: 'asc' }], select: { id: true, name: true, category: true } }),
  ])
  const matchingBrand = brands.find((brand) => brand.name.toLocaleLowerCase() === source.make?.trim().toLocaleLowerCase())

  return <>
    <AdminPageHeader
      title="Convert Procurement to Inventory Draft"
      text={`Seller intake ${source.referenceNumber}. Conversion creates exactly one unpublished inventory vehicle, preserving the existing seller record.`}
      breadcrumb="Procurement / Draft Conversion"
      actions={<Link href="/admin/procurement" className="admin-button admin-button--secondary">Back to procurement</Link>}
    />
    {source.procuredVehicle ? <section className="admin-panel admin-panel--full">
      <div className="admin-panel__body">
        <h2>This intake has already been converted.</h2>
        <p>Duplicate conversion is blocked.</p>
        <Link href={`/admin/vehicles/${source.procuredVehicle.id}`}>View linked vehicle draft</Link>
      </div>
    </section> : !readiness.eligible ? <section className="admin-panel admin-panel--full">
      <div className="admin-panel__body">
        <h2>Procurement is not ready for inventory conversion.</h2>
        <ul>{readiness.missing.map((reason) => <li key={reason}>{reason}</li>)}</ul>
        <Link href={`/admin/sell-requests/${source.id}`}>Review acquisition evidence</Link>
      </div>
    </section> : <>
      <section className="admin-panel admin-panel--full">
        <div className="admin-panel__body">
          <h2>Acquisition evidence available</h2>
          <p>Only vehicle facts are prefilled. Verify registration, condition, sale price and all public specifications; no private seller identity or files will be copied.</p>
          <p>The resulting vehicle remains a draft and cannot appear on the public inventory until separately authorized for publication.</p>
        </div>
      </section>
      <VehicleForm
        brands={brands}
        bodyTypes={bodyTypes}
        features={features}
        procurement={{ id: source.id, version: source.version }}
        initialValues={{
          brandId: matchingBrand?.id ?? '',
          model: source.model ?? '',
          year: source.year ?? new Date().getFullYear(),
          mileage: source.mileage ?? 0,
        }}
      />
    </>}
  </>
}
