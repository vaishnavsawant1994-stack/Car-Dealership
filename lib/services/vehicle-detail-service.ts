import 'server-only'

import { mapVehicleCard, mapVehicleDetail } from '@/lib/mappers/vehicle-mapper'
import { getRelatedVehicles, incrementVehicleViewCount, resolvePublicVehicleSlug } from '@/lib/repositories/vehicle-repository'
import { logSafeError } from '@/lib/observability/safe-log'

export async function getVehicleDetail(slug: string, options: { incrementView?: boolean } = {}) {
  const resolved = await resolvePublicVehicleSlug(slug)
  if (!resolved) return null
  const { vehicle, redirectedFrom } = resolved
  if (options.incrementView) {
    incrementVehicleViewCount(vehicle.id).catch((error: unknown) => {
      logSafeError('vehicle_view_increment_failed', error, { vehicleId: vehicle.id })
    })
  }
  const related = await getRelatedVehicles({ vehicleId: vehicle.id, brandId: vehicle.brandId, bodyTypeId: vehicle.bodyTypeId, price: vehicle.price })
  return { vehicle: mapVehicleDetail(vehicle), related: related.map(mapVehicleCard), redirectedFrom }
}
