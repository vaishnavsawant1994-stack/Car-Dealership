import 'server-only'

import { prisma } from '@/lib/db/prisma'
import {
  PROCUREMENT_PAGE_SIZE, emptyProcurementCounts, procurementAssignmentScope,
  procurementStageForStatus, procurementWhere, type ProcurementFilters,
} from './intake'
import type { AdminActor } from '@/lib/auth/require-admin'

/**
 * Read-only procurement board on the canonical SellRequest lifecycle.
 * No seller attachments, private notes, telephone numbers or payment information
 * are selected by this service.
 */
export async function getProcurementBoard(actor: AdminActor, filters: ProcurementFilters) {
  const where = procurementWhere(actor, filters)
  const [rows, total, grouped] = await Promise.all([
    prisma.sellRequest.findMany({
      where,
      take: PROCUREMENT_PAGE_SIZE,
      skip: (filters.page - 1) * PROCUREMENT_PAGE_SIZE,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        referenceNumber: true,
        name: true,
        make: true,
        model: true,
        year: true,
        status: true,
        priority: true,
        assignedToId: true,
        assignedTo: { select: { name: true } },
        followUpAt: true,
        createdAt: true,
      },
    }),
    prisma.sellRequest.count({ where }),
    prisma.sellRequest.groupBy({
      by: ['status'],
      where: procurementAssignmentScope(actor, filters.assigned),
      _count: { _all: true },
    }),
  ])
  const stageCounts = emptyProcurementCounts()
  for (const group of grouped) stageCounts[procurementStageForStatus[group.status]] += group._count._all

  return {
    items: rows,
    stageCounts,
    pagination: {
      page: filters.page,
      pageSize: PROCUREMENT_PAGE_SIZE,
      total,
      totalPages: Math.max(1, Math.ceil(total / PROCUREMENT_PAGE_SIZE)),
    },
  }
}
