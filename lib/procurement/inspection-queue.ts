import 'server-only'

import type { AdminActor } from '@/lib/auth/require-admin'
import { prisma } from '@/lib/db/prisma'
import { assessInspectionReadiness, inspectableIntakeStatuses } from './inspection-readiness'
import { procurementAssignmentScope } from './intake'

/**
 * A read-only, bounded queue of intake inspections. It uses the same assignment
 * policy as the existing SellRequest staff workspace and selects no sensitive
 * customer contact data, internal notes, attachments or financial details.
 */
export async function getProcurementInspectionQueue(actor: AdminActor) {
  const records = await prisma.sellRequest.findMany({
    where: {
      ...procurementAssignmentScope(actor, 'all'),
      status: { in: [...inspectableIntakeStatuses] },
    },
    take: 100,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: {
      id: true,
      referenceNumber: true,
      name: true,
      make: true,
      model: true,
      year: true,
      status: true,
      createdAt: true,
      assignedTo: { select: { name: true } },
      inspection: {
        select: {
          exteriorScore: true,
          interiorScore: true,
          mechanicalScore: true,
          overallConditionScore: true,
          documentsVerified: true,
          serviceHistoryVerified: true,
          completedAt: true,
        },
      },
    },
  })

  return records.map(({ inspection, ...record }) => ({
    ...record,
    readiness: assessInspectionReadiness(inspection),
  }))
}
