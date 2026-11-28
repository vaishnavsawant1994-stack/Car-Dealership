import 'server-only'

import { Prisma, VehicleStatus } from '@prisma/client'
import { canAccessAssignedResource } from '@/lib/auth/admin-resource-policy'
import type { AdminActor } from '@/lib/auth/require-admin'
import { prisma } from '@/lib/db/prisma'
import { assessProcurementDraftEligibility, type ConvertProcurementInput } from './draft-conversion'

/**
 * Converting procurement to inventory is not publishing a vehicle, taking a
 * payment or verifying legal title. An operator has already marked acquisition
 * COMPLETE in the existing canonical workflow; evidence is rechecked here.
 */
export async function createVehicleFromProcurement(
  requestId: string, actor: AdminActor, input: ConvertProcurementInput,
) {
  return prisma.$transaction(async (tx) => {
    const source = await tx.sellRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        status: true,
        version: true,
        assignedToId: true,
        inspection: {
          select: {
            completedAt: true,
            documentsVerified: true,
            overallConditionScore: true,
          },
        },
        valuations: {
          select: { finalOffer: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        procuredVehicle: { select: { id: true } },
      },
    })

    if (!source || !canAccessAssignedResource(actor, source)) return { type: 'not-found' as const }
    if (source.procuredVehicle) {
      return { type: 'already-converted' as const, vehicleId: source.procuredVehicle.id }
    }
    if (source.version !== input.version) return { type: 'conflict' as const }
    const eligibility = assessProcurementDraftEligibility(source)
    if (!eligibility.eligible) return { type: 'not-ready' as const, missing: eligibility.missing }

    // Acquire a CAS write lock. Competing conversions/lead edits cannot silently
    // reuse the same acquisition version; all writes below roll back together.
    const claimed = await tx.sellRequest.updateMany({
      where: { id: requestId, version: input.version },
      data: { version: { increment: 1 } },
    })
    if (claimed.count !== 1) return { type: 'conflict' as const }

    // The operator enters complete vehicle facts; never copy private seller
    // contact or attachment data into public inventory.
    const { featureIds, status: _ignoredStatus, version: _ignoredVersion, ...vehicleData } = input.vehicle
    const created = await tx.vehicle.create({
      data: {
        ...vehicleData,
        procurementRequestId: requestId,
        status: VehicleStatus.DRAFT,
        published: false,
        publishedAt: null,
        createdById: actor.id,
        updatedById: actor.id,
      },
      select: { id: true, slug: true, stockNumber: true, published: true, status: true },
    })

    if (featureIds.length) {
      await tx.vehicleFeature.createMany({
        data: [...new Set(featureIds)].map((featureId) => ({ vehicleId: created.id, featureId })),
      })
    }

    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: 'PROCUREMENT_DRAFT_CREATED',
        entity: 'Vehicle',
        entityId: created.id,
        resourceType: 'Vehicle',
        resourceId: created.id,
        summary: 'Converted a completed fictional procurement intake into an unpublished vehicle draft.',
        metadata: { procurementRequestId: requestId },
      },
    })

    return { type: 'created' as const, data: created }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
}
