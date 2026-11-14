import { ClipboardCheck } from 'lucide-react'
import Link from 'next/link'
import { AdminEmpty, AdminMetric, AdminPageHeader, AdminPagination, AdminStatus } from '@/components/admin/AdminPrimitives'
import { requirePermission } from '@/lib/auth/require-permission'
import { hasPermission } from '@/lib/auth/admin-permissions'
import { parseProcurementFilters, procurementStages } from '@/lib/procurement/intake'
import { getProcurementBoard } from '@/lib/procurement/intake-service'

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; assigned?: string; page?: string }>
}) {
  const actor = await requirePermission('sellRequest.view')
  const filters = parseProcurementFilters(await searchParams)
  const data = await getProcurementBoard(actor, filters)
  return <>
    <AdminPageHeader
      title="Procurement Intake"
      text="Track incoming seller vehicles from initial enquiry through inspection, valuation and acquisition using existing Sell Requests."
      breadcrumb="Procurement Intake"
      actions={<><Link className="admin-button admin-button--secondary" href="/admin/sell-requests">All sell requests</Link>{hasPermission(actor.role, "sellRequest.inspect") ? <Link className="admin-button admin-button--secondary" href="/admin/procurement/inspections">Inspection readiness</Link> : null}</>}
    />
    <section className="admin-metrics" aria-label="Visible procurement pipeline totals">
      {procurementStages.map((stage) => <AdminMetric
        key={stage.key}
        label={stage.label}
        value={data.stageCounts[stage.key]}
        helper="Records accessible to your role"
        icon={ClipboardCheck}
      />)}
    </section>
    <form className="admin-filterbar" method="get">
      <label>Pipeline stage
        <select name="stage" defaultValue={filters.stage ?? 'all'}>
          <option value="all">All stages</option>
          {procurementStages.map((stage) => <option key={stage.key} value={stage.key}>{stage.label}</option>)}
        </select>
      </label>
      <label>Assignment
        <select name="assigned" defaultValue={filters.assigned}>
          <option value="all">Accessible records</option>
          <option value="mine">Assigned to me</option>
          <option value="unassigned">Unassigned</option>
        </select>
      </label>
      <button className="admin-button" type="submit">Apply filters</button>
    </form>
    {data.items.length ? <>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <caption>{data.pagination.total} procurement requests match your filters</caption>
          <thead><tr><th>Reference</th><th>Seller</th><th>Vehicle</th><th>Stage</th><th>Priority</th><th>Assigned</th><th>Received</th></tr></thead>
          <tbody>
            {data.items.map((item) => <tr key={item.id}>
              <td><Link href={`/admin/sell-requests/${item.id}`}><strong>{item.referenceNumber}</strong></Link></td>
              <td>{item.name ?? 'Customer'}</td>
              <td>{[item.year, item.make, item.model].filter(Boolean).join(' ') || 'Vehicle information pending'}</td>
              <td><AdminStatus value={item.status} /></td>
              <td><AdminStatus value={item.priority} /></td>
              <td>{item.assignedTo?.name ?? 'Unassigned'}</td>
              <td><time dateTime={item.createdAt.toISOString()}>{item.createdAt.toLocaleDateString('en-IN')}</time></td>
            </tr>)}
          </tbody>
        </table>
      </div>
      <div className="admin-mobile-cards">
        {data.items.map((item) => <article className="admin-mobile-card" key={item.id}>
          <header><h2>{item.referenceNumber}</h2><AdminStatus value={item.status} /></header>
          <p>{[item.year, item.make, item.model].filter(Boolean).join(' ') || 'Vehicle information pending'}</p>
          <footer><span>{item.assignedTo?.name ?? 'Unassigned'}</span><Link href={`/admin/sell-requests/${item.id}`}>Open intake</Link></footer>
        </article>)}
      </div>
      <AdminPagination
        page={data.pagination.page}
        totalPages={data.pagination.totalPages}
        basePath="/admin/procurement"
        params={{ stage: filters.stage ?? undefined, assigned: filters.assigned }}
      />
    </> : <AdminEmpty title="No procurement requests" text="No incoming vehicles match these filters or your current assignment access." />}
  </>
}
