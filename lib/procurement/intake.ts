import { RequestStatus, UserRole, type Prisma } from '@prisma/client'

export const procurementStages = [
  { key: 'new', label: 'New intake' },
  { key: 'inspection', label: 'Inspection' },
  { key: 'valuation', label: 'Valuation & offers' },
  { key: 'acquisition', label: 'Acquisition' },
  { key: 'closed', label: 'Closed' },
] as const
export type ProcurementStage = (typeof procurementStages)[number]['key']

/** Canonical SellRequest statuses, not a parallel procurement state machine. */
export const procurementStageForStatus: Record<RequestStatus, ProcurementStage> = {
  [RequestStatus.DRAFT]: 'new',
  [RequestStatus.SUBMITTED]: 'new',
  [RequestStatus.UNDER_REVIEW]: 'new',
  [RequestStatus.CONTACTED]: 'new',
  [RequestStatus.INSPECTION_SCHEDULED]: 'inspection',
  [RequestStatus.INSPECTION_COMPLETED]: 'inspection',
  [RequestStatus.INSPECTED]: 'inspection',
  [RequestStatus.VALUATION_READY]: 'valuation',
  [RequestStatus.OFFER_MADE]: 'valuation',
  [RequestStatus.NEGOTIATING]: 'valuation',
  [RequestStatus.OFFER_ACCEPTED]: 'acquisition',
  [RequestStatus.ACCEPTED]: 'acquisition',
  [RequestStatus.DOCUMENTATION]: 'acquisition',
  [RequestStatus.PAYMENT_PROCESSING]: 'acquisition',
  [RequestStatus.COMPLETED]: 'acquisition',
  [RequestStatus.OFFER_REJECTED]: 'closed',
  [RequestStatus.REJECTED]: 'closed',
  [RequestStatus.CANCELLED]: 'closed',
  [RequestStatus.EXPIRED]: 'closed',
}

export const PROCUREMENT_PAGE_SIZE = 20
export type ProcurementFilters = { stage: ProcurementStage | null; assigned: 'all' | 'mine' | 'unassigned'; page: number }

export function parseProcurementFilters(input: { stage?: string | null; assigned?: string | null; page?: string | null }): ProcurementFilters {
  const validStage = procurementStages.find((item) => item.key === input.stage)?.key ?? null
  const assigned = input.assigned === 'mine' || input.assigned === 'unassigned' ? input.assigned : 'all'
  const page = input.page && /^[1-9][0-9]{0,3}$/.test(input.page) ? Math.min(100, Number(input.page)) : 1
  return { stage: validStage, assigned, page }
}

export function procurementAssignmentScope(actor: { id: string; role: UserRole }, assigned: ProcurementFilters['assigned']): Prisma.SellRequestWhereInput {
  if (actor.role === UserRole.ADMIN || actor.role === UserRole.SUPER_ADMIN) {
    if (assigned === 'mine') return { assignedToId: actor.id }
    if (assigned === 'unassigned') return { assignedToId: null }
    return {}
  }
  if (assigned === 'mine') return { assignedToId: actor.id }
  if (assigned === 'unassigned') return { assignedToId: null }
  return { OR: [{ assignedToId: null }, { assignedToId: actor.id }] }
}

export function procurementWhere(actor: { id: string; role: UserRole }, filters: ProcurementFilters): Prisma.SellRequestWhereInput {
  const scope = procurementAssignmentScope(actor, filters.assigned)
  const statuses = filters.stage
    ? (Object.entries(procurementStageForStatus) as Array<[RequestStatus, ProcurementStage]>)
      .filter(([, stage]) => stage === filters.stage).map(([status]) => status)
    : []
  return { ...scope, ...(filters.stage ? { status: { in: statuses } } : {}) }
}

export function emptyProcurementCounts(): Record<ProcurementStage, number> {
  return { new: 0, inspection: 0, valuation: 0, acquisition: 0, closed: 0 }
}
