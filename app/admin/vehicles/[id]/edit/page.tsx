import { notFound } from 'next/navigation'
import { AdminPageHeader } from '@/components/admin/AdminPrimitives'
import { VehicleForm } from '@/components/admin/VehicleForm'
import { requirePermission } from '@/lib/auth/require-permission'
import { prisma } from '@/lib/db/prisma'
import { getActorShowroomScope } from '@/lib/auth/showroom-scope'
import { showroomScopeWhere } from '@/lib/auth/admin-resource-policy'

export default async function EditVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePermission('vehicle.update')
  const showroom = showroomScopeWhere(await getActorShowroomScope(actor))
  const { id } = await params
  const [vehicle, brands, bodyTypes, features] = await Promise.all([prisma.vehicle.findFirst({ where: { id, ...showroom }, include: { features: { select: { featureId: true } } } }), prisma.brand.findMany({ where: { active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } }), prisma.bodyType.findMany({ where: { active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } }), prisma.feature.findMany({ where: { active: true }, orderBy: [{ category: 'asc' }, { name: 'asc' }], select: { id: true, name: true, category: true } })])
  if (!vehicle) notFound()
  const formVehicle = {
    id: vehicle.id,
    brandId: vehicle.brandId,
    bodyTypeId: vehicle.bodyTypeId,
    model: vehicle.model,
    variant: vehicle.variant,
    stockNumber: vehicle.stockNumber,
    slug: vehicle.slug,
    shortTitle: vehicle.shortTitle,
    year: vehicle.year,
    registrationYear: vehicle.registrationYear ?? undefined,
    registrationState: vehicle.registrationState ?? '',
    registrationNumberMasked: vehicle.registrationNumberMasked ?? '',
    price: vehicle.price,
    originalPrice: vehicle.originalPrice ?? undefined,
    currency: vehicle.currency,
    mileage: vehicle.mileage,
    fuelType: vehicle.fuelType,
    transmission: vehicle.transmission,
    exteriorColor: vehicle.exteriorColor ?? '',
    interiorColor: vehicle.interiorColor ?? '',
    engineDescription: vehicle.engineDescription ?? '',
    power: vehicle.power ?? '',
    torque: vehicle.torque ?? '',
    drivetrain: vehicle.drivetrain ?? '',
    seatingCapacity: vehicle.seatingCapacity ?? undefined,
    doors: vehicle.doors ?? undefined,
    ownershipCount: vehicle.ownershipCount ?? undefined,
    insuranceValidity: vehicle.insuranceValidity?.toISOString(),
    serviceHistory: vehicle.serviceHistory ?? '',
    keysAvailable: vehicle.keysAvailable ?? undefined,
    shortDescription: vehicle.shortDescription,
    description: vehicle.description,
    status: vehicle.status,
    featured: vehicle.featured,
    newArrival: vehicle.newArrival,
    certified: vehicle.certified,
    version: vehicle.version,
    featureIds: vehicle.features.map((item) => item.featureId),
  }
  return <><AdminPageHeader title={`Edit ${vehicle.shortTitle}`} text="Optimistic version checks prevent another staff member's changes from being overwritten." breadcrumb="Vehicles / Edit" /><VehicleForm vehicle={formVehicle} brands={brands} bodyTypes={bodyTypes} features={features} /></>
}
