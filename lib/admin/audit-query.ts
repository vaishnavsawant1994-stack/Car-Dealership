import type { Prisma } from '@prisma/client'

export const AUDIT_PAGE_SIZE = 50
export type AuditFilterInput = {
  page?: string | null
  search?: string | null
  action?: string | null
  resource?: string | null
}

function safeCategory(value: string | null | undefined) {
  const trimmed = value?.trim() ?? ''
  return trimmed.length <= 80 && /^[A-Za-z0-9_.:-]*$/.test(trimmed) ? trimmed : ''
}

export function parseAuditFilters(input: AuditFilterInput) {
  const rawPage = input.page?.trim() ?? ''
  const page = /^[1-9][0-9]{0,4}$/.test(rawPage) ? Math.min(10_000, Number(rawPage)) : 1
  return {
    page,
    search: (input.search?.trim() ?? '').slice(0, 120),
    action: safeCategory(input.action),
    resource: safeCategory(input.resource),
  }
}

export type AuditFilters = ReturnType<typeof parseAuditFilters>

export function buildAuditWhere(filters: AuditFilters): Prisma.AuditLogWhereInput {
  return {
    ...(filters.action ? { action: filters.action } : {}),
    ...(filters.resource ? { resourceType: filters.resource } : {}),
    ...(filters.search ? {
      OR: [
        { summary: { contains: filters.search, mode: 'insensitive' as const } },
        { action: { contains: filters.search, mode: 'insensitive' as const } },
      ],
    } : {}),
  }
}

export function auditPageOffset(filters: AuditFilters) {
  return (filters.page - 1) * AUDIT_PAGE_SIZE
}

/** Only explicitly selected, nonsecret audit fields are returned by the list API. */
export const auditListSelect = {
  id: true,
  actorId: true,
  actor: { select: { name: true, email: true } },
  action: true,
  entity: true,
  entityId: true,
  resourceType: true,
  resourceId: true,
  summary: true,
  ipHash: true,
  createdAt: true,
} as const satisfies Prisma.AuditLogSelect
