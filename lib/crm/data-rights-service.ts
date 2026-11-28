import 'server-only'

import { CustomerDataRightsStatus, Prisma, UserRole } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import type { CustomerDataRightsKind } from '@prisma/client'

const pending = [CustomerDataRightsStatus.PENDING_ID_VERIFICATION, CustomerDataRightsStatus.UNDER_MANUAL_REVIEW]

export async function listCustomerDataRightsRequests(customerId: string) {
  return prisma.customerDataRightsRequest.findMany({
    where: { customerId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 50,
    select: { id: true, kind: true, status: true, createdAt: true,
      createdBy: { select: { name: true } } },
  })
}

export async function createCustomerDataRightsRequest(customerId: string, actorId: string, kind: CustomerDataRightsKind) {
  return prisma.$transaction(async (tx) => {
    const customer = await tx.user.findFirst({
      where: { id: customerId, role: UserRole.CUSTOMER, deletedAt: null },
      select: { id: true },
    })
    if (!customer) return { type: 'not-found' as const }
    const duplicate = await tx.customerDataRightsRequest.findFirst({
      where: { customerId, kind, status: { in: pending } },
      select: { id: true },
    })
    if (duplicate) return { type: 'already-open' as const, id: duplicate.id }

    const result = await tx.customerDataRightsRequest.create({
      data: { customerId, createdById: actorId, kind },
      select: { id: true, kind: true, status: true, createdAt: true },
    })
    await tx.auditLog.create({
      data: { actorId, action: 'CUSTOMER_DATA_RIGHTS_REQUEST_LOGGED',
        entity: 'CustomerDataRightsRequest', entityId: result.id,
        resourceType: 'User', resourceId: customerId,
        summary: 'Logged a customer data-rights request pending manual identity verification.',
        metadata: { kind },
      },
    })
    return { type: 'created' as const, data: result }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
}
