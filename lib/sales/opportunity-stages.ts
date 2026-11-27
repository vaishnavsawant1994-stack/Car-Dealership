import { InquiryStatus, TestDriveStatus, UserRole } from '@prisma/client'

export const salesStages = ['new', 'engaged', 'scheduled', 'completed', 'closed', 'lost'] as const
export type SalesStage = (typeof salesStages)[number]

export const inquiryStage: Record<InquiryStatus, SalesStage> = {
  NEW: 'new',
  ASSIGNED: 'new',
  CONTACTED: 'engaged',
  IN_PROGRESS: 'engaged',
  WAITING_FOR_CUSTOMER: 'engaged',
  RESOLVED: 'closed',
  CLOSED: 'closed',
  CANCELLED: 'lost',
  SPAM: 'lost',
}

export const testDriveStage: Record<TestDriveStatus, SalesStage> = {
  REQUESTED: 'new',
  CONFIRMED: 'scheduled',
  RESCHEDULE_REQUESTED: 'scheduled',
  RESCHEDULED: 'scheduled',
  COMPLETED: 'completed',
  CANCELLED: 'lost',
  REJECTED: 'lost',
  NO_SHOW: 'lost',
}

export type SalesFilters = { stage: SalesStage | null; assignment: 'all' | 'mine' | 'unassigned' }
export function parseSalesFilters(input: { stage?: string | null; assignment?: string | null }): SalesFilters {
  return {
    stage: salesStages.find((stage) => stage === input.stage) ?? null,
    assignment: input.assignment === 'mine' || input.assignment === 'unassigned' ? input.assignment : 'all',
  }
}

/** An individual contributor cannot browse another employee's assigned opportunities. */
export function salesAssignmentScope(
  actor: { id: string; role: UserRole }, assignment: SalesFilters['assignment'],
): { assignedToId?: string | null; OR?: Array<{ assignedToId: string | null }> } {
  if (actor.role === UserRole.SUPER_ADMIN || actor.role === UserRole.ADMIN) {
    if (assignment === 'mine') return { assignedToId: actor.id }
    if (assignment === 'unassigned') return { assignedToId: null }
    return {}
  }
  if (assignment === 'mine') return { assignedToId: actor.id }
  if (assignment === 'unassigned') return { assignedToId: null }
  return { OR: [{ assignedToId: null }, { assignedToId: actor.id }] }
}

export function inquiryStatusesForStage(stage: SalesStage | null) {
  return stage ? (Object.entries(inquiryStage) as Array<[InquiryStatus, SalesStage]>)
    .filter(([, value]) => value === stage).map(([status]) => status) : Object.values(InquiryStatus)
}
export function testDriveStatusesForStage(stage: SalesStage | null) {
  return stage ? (Object.entries(testDriveStage) as Array<[TestDriveStatus, SalesStage]>)
    .filter(([, value]) => value === stage).map(([status]) => status) : Object.values(TestDriveStatus)
}
export function emptySalesStageCounts(): Record<SalesStage, number> {
  return { new: 0, engaged: 0, scheduled: 0, completed: 0, closed: 0, lost: 0 }
}
