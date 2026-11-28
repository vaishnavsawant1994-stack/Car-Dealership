import 'server-only'

import type { AdminActor } from '@/lib/auth/require-admin'
import { showroomScopeWhere } from '@/lib/auth/admin-resource-policy'
import { getActorShowroomScope } from '@/lib/auth/showroom-scope'
import { prisma } from '@/lib/db/prisma'

/** Counts only; intentionally excludes customer, vehicle, invoice and payment details. */
export async function getShowroomAnalytics(actor: AdminActor) {
  const scope = await getActorShowroomScope(actor)
  const showroom = showroomScopeWhere(scope)
  const vehicleShowroom = scope.global ? {} : { vehicle: { is: { showroomId: { in: [...scope.showroomIds] } } } }
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const [salesDeals, deliveries, workshopOrders, afterSalesTasks] = await Promise.all([
    prisma.salesDeal.findMany({ where: { ...showroom, ...vehicleShowroom, createdAt: { gte: since } }, select: { status: true } }),
    prisma.deliveryCase.findMany({ where: { ...showroom, ...vehicleShowroom }, select: { status: true } }),
    prisma.workshopOrder.findMany({ where: { ...showroom, ...vehicleShowroom }, select: { status: true } }),
    prisma.afterSalesTask.findMany({ where: { ...showroom,
      ...(!scope.global ? { deliveryCase: { is: vehicleShowroom } } : {}) }, select: { status: true } }),
  ])
  const counts = (rows: Array<{ status: string }>) => {
    const grouped = new Map<string, number>()
    for (const { status } of rows) grouped.set(status, (grouped.get(status) ?? 0) + 1)
    return [...grouped].map(([status, count]) => ({ status, count }))
  }
  return { periodDays: 30, salesDeals: counts(salesDeals), deliveries: counts(deliveries), workshopOrders: counts(workshopOrders), afterSalesTasks: counts(afterSalesTasks) }
}
