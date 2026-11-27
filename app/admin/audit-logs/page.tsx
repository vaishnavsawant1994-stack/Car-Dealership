import { AdminEmpty, AdminPageHeader, AdminPagination } from '@/components/admin/AdminPrimitives'
import { AUDIT_PAGE_SIZE, auditListSelect, auditPageOffset, buildAuditWhere, parseAuditFilters } from '@/lib/admin/audit-query'
import { requirePermission } from '@/lib/auth/require-permission'
import { prisma } from '@/lib/db/prisma'

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; action?: string; resource?: string }>
}) {
  await requirePermission('auditLog.view')
  const filters = parseAuditFilters(await searchParams)
  const where = buildAuditWhere(filters)
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      select: auditListSelect,
      take: AUDIT_PAGE_SIZE,
      skip: auditPageOffset(filters),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    }),
    prisma.auditLog.count({ where }),
  ])
  return <>
    <AdminPageHeader title="Audit Logs" text="Read-only timeline of privileged activity. Sensitive metadata is excluded from list results." breadcrumb="Audit Logs" />
    <form className="admin-filterbar" method="get">
      <label className="admin-filterbar__search">Search<input name="search" defaultValue={filters.search} maxLength={120} /></label>
      <label>Action<input name="action" defaultValue={filters.action} maxLength={80} /></label>
      <label>Resource<input name="resource" defaultValue={filters.resource} maxLength={80} /></label>
      <button className="admin-button" type="submit">Filter</button>
    </form>
    {items.length ? <>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <caption>{total} audit records</caption>
          <thead><tr><th>Date</th><th>Actor</th><th>Action</th><th>Resource</th><th>Summary</th><th>IP hash</th></tr></thead>
          <tbody>
            {items.map((item) => <tr key={item.id}>
              <td><time dateTime={item.createdAt.toISOString()}>{item.createdAt.toLocaleString('en-IN')}</time></td>
              <td>{item.actor?.name ?? item.actor?.email ?? 'System'}</td>
              <td>{item.action}</td>
              <td>{item.resourceType ?? item.entity}</td>
              <td>{item.summary ?? '—'}</td>
              <td><small>{item.ipHash?.slice(0, 12) ?? '—'}</small></td>
            </tr>)}
          </tbody>
        </table>
      </div>
      <AdminPagination page={filters.page} totalPages={Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE))} basePath="/admin/audit-logs" params={{ search: filters.search, action: filters.action, resource: filters.resource }} />
    </> : <AdminEmpty title="No audit records" text="No privileged activity matches these filters." />}
  </>
}
