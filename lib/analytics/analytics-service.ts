import 'server-only'

import type { AdminActor } from '@/lib/auth/require-admin'
import { showroomScopeWhere } from '@/lib/auth/admin-resource-policy'
import { getActorShowroomScope } from '@/lib/auth/showroom-scope'
import { prisma } from '@/lib/db/prisma'

/** Counts only; intentionally excludes customer, vehicle, invoice and payment details. */
export async function getShowroomAnalytics(actor: AdminActor) {
  const scope = await getActorShowroomScope(actor)
  const showroom = showroomScopeWhere(scope)
  const [salesDeals, deliveries, workshopOrders, afterSalesTasks] = await Promise.all([
    prisma.salesDeal.groupBy({ by: ['status'], where: { ...showroom, createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }, _count: { _all: true } }),
    prisma.deliveryCase.groupBy({ by: ['status'], where: showroom, _count: { _all: true } }),
    prisma.workshopOrder.groupBy({ by: ['status'], where: showroom, _count: { _all: true } }),
    prisma.afterSalesTask.groupBy({ by: ['status'], where: showroom, _count: { _all: true } }),
  ])
  const counts = <T extends { status: string; _count: { _all: number } }>(rows: T[]) => rows.map(({ status, _count }) => ({ status, count: _count._all }))
  return { periodDays: 30, salesDeals: counts(salesDeals), deliveries: counts(deliveries), workshopOrders: counts(workshopOrders), afterSalesTasks: counts(afterSalesTasks) }
}
