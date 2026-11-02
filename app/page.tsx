import { HomePage } from '@/components/home/HomePage'
import { logSafeError } from '@/lib/observability/safe-log'
import { brands as fallbackBrands, vehicles as fallbackVehicles } from '@/lib/constants/site'
import { mapVehicleCard } from '@/lib/mappers/vehicle-mapper'
import { getFeaturedBrands } from '@/lib/repositories/brand-repository'
import { getNewArrivalVehicles } from '@/lib/repositories/vehicle-repository'
import { mapBrandSummary } from '@/lib/services/inventory-service'
import type { BrandSummary, VehicleCardData } from '@/lib/types/inventory'

export const dynamic = 'force-dynamic'

export default async function Page() {
  try {
    const [vehicleRecords, brandRecords] = await Promise.all([getNewArrivalVehicles(10), getFeaturedBrands(10)])
    return <HomePage vehicles={vehicleRecords.map(mapVehicleCard)} brands={brandRecords.map(mapBrandSummary)} />
  } catch (error) {
    logSafeError('homepage_inventory_database_failed', error)
    if (process.env.NODE_ENV === 'production') throw error
    return <HomePage vehicles={developmentVehicleFallback()} brands={developmentBrandFallback()} />
  }
}

function developmentVehicleFallback(): VehicleCardData[] {
  return fallbackVehicles.map((vehicle) => ({
    ...vehicle,
    brandSlug: slugFor(vehicle.make),
    mileageValue: Number(vehicle.mileage.replace(/\D/g, '')),
    priceValue: Number(vehicle.price.replace(/\D/g, '')),
    imageAlt: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
    status: 'AVAILABLE' as const,
    certified: true,
    newArrival: true,
    bodyType: 'Luxury Car',
    bodyTypeSlug: 'sedan',
  }))
}

function developmentBrandFallback(): BrandSummary[] {
  return fallbackBrands.map((brand) => ({
    id: brand.slug,
    name: brand.name,
    slug: brand.slug,
    logoUrl: `/images/brands/${brand.slug}.svg`,
    logoAlt: `${brand.name} logo`,
    description: `${brand.name} premium pre-owned vehicles.`,
    country: '',
    vehicleCount: 0,
    accent: brand.accent,
  }))
}

function slugFor(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}
