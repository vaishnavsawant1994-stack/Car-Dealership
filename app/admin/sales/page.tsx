import { MessageSquareText } from 'lucide-react'
import Link from 'next/link'
import { AdminEmpty, AdminMetric, AdminPageHeader, AdminStatus } from '@/components/admin/AdminPrimitives'
import { requirePermission } from '@/lib/auth/require-permission'
import { getSalesOpportunityBoard } from '@/lib/sales/opportunity-service'
import { parseSalesFilters, salesStages } from '@/lib/sales/opportunity-stages'

export default async function Page({
  searchParams,
}: { searchParams: Promise<{ stage?: string; assignment?: string }> }) {
  const actor = await requirePermission('enquiry.view')
  await requirePermission('testDrive.view')
  const filters = parseSalesFilters(await searchParams)
  const { items, stageCounts, matchingTotal, maxShown } = await getSalesOpportunityBoard(actor, filters)
  return <>
    <AdminPageHeader title="Sales Opportunities"
      text="Private enquiry and test-drive work queue, grouped by their existing lifecycle states. This is not an invoicing or deal-closing ledger."
      breadcrumb="Sales / Opportunities"
      actions={<>
        <Link className="admin-button admin-button--secondary" href="/admin/enquiries">Enquiries</Link>
        <Link className="admin-button admin-button--secondary" href="/admin/test-drives">Test drives</Link>
      </>}
    />
    <section className="admin-metrics" aria-label="Accessible opportunity stage counts">
      {salesStages.map((stage) => <AdminMetric key={stage}
        label={stage.charAt(0).toUpperCase() + stage.slice(1)}
        value={stageCounts[stage]} icon={MessageSquareText}
        helper="Records visible to your assignment role" />)}
    </section>
    <form className="admin-filterbar" method="get">
      <label>Stage
        <select name="stage" defaultValue={filters.stage ?? ''}>
          <option value="">All stages</option>
          {salesStages.map((stage) => <option key={stage} value={stage}>
            {stage.charAt(0).toUpperCase() + stage.slice(1)}
          </option>)}
        </select>
      </label>
      <label>Assignment
        <select name="assignment" defaultValue={filters.assignment}>
          <option value="all">Accessible opportunities</option>
          <option value="mine">Assigned to me</option>
          <option value="unassigned">Unassigned</option>
        </select>
      </label>
      <button className="admin-button" type="submit">Apply filters</button>
    </form>
    <p>{matchingTotal} matching opportunities; showing up to the {maxShown} newest records.
      Counts reflect the source records rather than a separate sales pipeline database.</p>
    {items.length ? <>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <caption>{items.length} current sales opportunities</caption>
          <thead><tr><th>Reference</th><th>Source</th><th>Vehicle</th><th>Stage</th><th>Status</th><th>Priority</th><th>Assigned</th><th>Received</th></tr></thead>
          <tbody>{items.map((item) => <tr key={item.kind + item.id}>
            <td><Link href={item.kind === 'enquiry' ? `/admin/enquiries/${item.id}` : `/admin/test-drives/${item.id}`}>
              <strong>{item.referenceNumber}</strong>
            </Link></td>
            <td>{item.kind === 'enquiry' ? 'Enquiry' : 'Test drive'}</td>
            <td>{item.vehicle?.shortTitle ?? 'General enquiry'}</td>
            <td>{item.stage}</td>
            <td><AdminStatus value={item.status} /></td>
            <td><AdminStatus value={item.priority} /></td>
            <td>{item.assignedTo?.name ?? 'Unassigned'}</td>
            <td><time dateTime={item.submittedAt.toISOString()}>{item.submittedAt.toLocaleDateString('en-IN')}</time></td>
          </tr>)}</tbody>
        </table>
      </div>
      <div className="admin-mobile-cards">{items.map((item) => <article className="admin-mobile-card" key={item.kind + item.id}>
        <header><h2>{item.referenceNumber}</h2><AdminStatus value={item.status} /></header>
        <p>{item.vehicle?.shortTitle ?? 'General enquiry'}</p>
        <p>{item.kind === 'enquiry' ? 'Enquiry' : 'Test drive'} · {item.stage} · Assigned: {item.assignedTo?.name ?? 'Unassigned'}</p>
        <footer><span>{item.priority}</span><Link href={item.kind === 'enquiry' ?
          `/admin/enquiries/${item.id}` : `/admin/test-drives/${item.id}`}>Open record</Link></footer>
      </article>)}</div>
    </> : <AdminEmpty title="No matching opportunities" text="Try a different stage or assignment filter." />}
  </>
}
