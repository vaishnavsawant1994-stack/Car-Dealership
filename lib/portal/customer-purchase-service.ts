import 'server-only'

import { UserRole, UserStatus } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'

/** Read-only customer view; scoped through the account-linked inquiry and omits internal finance and checklist data. */
export async function listCustomerPurchases(customerId: string) {
  const customer = await prisma.user.findFirst({ where: { id: customerId, role: UserRole.CUSTOMER,
    status: UserStatus.ACTIVE, deletedAt: null, emailVerified: { not: null } }, select: { id: true } })
  if (!customer) return []
  return prisma.salesDeal.findMany({ where: { inquiry: { userId: customer.id } },
    select: { id: true, referenceNumber: true, status: true, createdAt: true, updatedAt: true,
      vehicle: { select: { shortTitle: true, stockNumber: true, year: true } },
      showroom: { select: { name: true } },
      deliveryCase: { select: { referenceNumber: true, status: true, updatedAt: true,
        afterSalesTasks: { select: { status: true } } } },
    }, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], take: 100 })
}
