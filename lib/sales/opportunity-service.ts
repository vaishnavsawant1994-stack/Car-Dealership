import 'server-only'

import type { AdminActor } from '@/lib/auth/require-admin'
import { prisma } from '@/lib/db/prisma'
import {
  emptySalesStageCounts, inquiryStage, inquiryStatusesForStage,
  salesAssignmentScope, testDriveStage, testDriveStatusesForStage,
  type SalesFilters,
} from './opportunity-stages'

export async function getSalesOpportunityBoard(actor: AdminActor, filters: SalesFilters) {
  const scope = salesAssignmentScope(actor, filters.assignment)
  const [inquiries, drives, inquiryGroups, driveGroups] = await Promise.all([
    prisma.inquiry.findMany({
      where: { ...scope, ...(filters.stage ? { status: { in: inquiryStatusesForStage(filters.stage) } } : {}) },
      take: 100,
      orderBy: [{ submittedAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true, referenceNumber: true, status: true, priority: true, submittedAt: true,
        assignedTo: { select: { name: true } },
        vehicle: { select: { shortTitle: true, stockNumber: true } },
      },
    }),
    prisma.testDrive.findMany({
      where: { ...scope, ...(filters.stage ? { status: { in: testDriveStatusesForStage(filters.stage) } } : {}) },
      take: 100,
      orderBy: [{ submittedAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true, referenceNumber: true, status: true, priority: true, submittedAt: true,
        assignedTo: { select: { name: true } },
        vehicle: { select: { shortTitle: true, stockNumber: true } },
      },
    }),
    prisma.inquiry.groupBy({ by: ['status'], where: scope, _count: { _all: true } }),
    prisma.testDrive.groupBy({ by: ['status'], where: scope, _count: { _all: true } }),
  ])
  const stageCounts = emptySalesStageCounts()
  for (const row of inquiryGroups) stageCounts[inquiryStage[row.status]] += (row._count as { _all?: number } | undefined)?._all ?? 0
  for (const row of driveGroups) stageCounts[testDriveStage[row.status]] += (row._count as { _all?: number } | undefined)?._all ?? 0

  // Each source is independently bounded to 100, so the combined newest 100
  // cannot omit a more recent item from an individual source.
  const items = [
    ...inquiries.map((row) => ({
      ...row, kind: 'enquiry' as const, stage: inquiryStage[row.status],
    })),
    ...drives.map((row) => ({
      ...row, kind: 'testDrive' as const, stage: testDriveStage[row.status],
    })),
  ].sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime() ||
    b.id.localeCompare(a.id)).slice(0, 100)

  return {
    items,
    stageCounts,
    matchingTotal: filters.stage ? stageCounts[filters.stage] :
      Object.values(stageCounts).reduce((total, count) => total + count, 0),
    shown: items.length,
    maxShown: 100,
  }
}
