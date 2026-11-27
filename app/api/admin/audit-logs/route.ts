import { NextResponse } from 'next/server'
import { adminError } from '@/lib/admin/api'
import { AUDIT_PAGE_SIZE, auditListSelect, auditPageOffset, buildAuditWhere, parseAuditFilters } from '@/lib/admin/audit-query'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { prisma } from '@/lib/db/prisma'

export async function GET(request: Request) {
  try {
    await authorizeAdminRequest('auditLog.view')
    const q = new URL(request.url).searchParams
    const filters = parseAuditFilters({
      page: q.get('page'),
      search: q.get('search'),
      action: q.get('action'),
      resource: q.get('resourceType'),
    })
    const where = buildAuditWhere(filters)
    const [records, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        select: auditListSelect,
        take: AUDIT_PAGE_SIZE,
        skip: auditPageOffset(filters),
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      prisma.auditLog.count({ where }),
    ])
    // The list endpoint must not serialize legacy metadata, raw IPs, user-agent
    // strings, credentials, or any future columns added to AuditLog.
    const data = records.map(({ ipHash, ...record }) => ({
      ...record,
      ipHashPrefix: ipHash?.slice(0, 12) ?? null,
    }))
    return NextResponse.json({
      data,
      pagination: { page: filters.page, pageSize: AUDIT_PAGE_SIZE, total },
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    return adminError(error)
  }
}
