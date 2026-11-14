import Link from 'next/link'
import { AdminEmpty, AdminPageHeader, AdminStatus } from '@/components/admin/AdminPrimitives'
import { requirePermission } from '@/lib/auth/require-permission'
import { getProcurementInspectionQueue } from '@/lib/procurement/inspection-queue'

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ attention?: string }>
}) {
  const actor = await requirePermission('sellRequest.inspect')
  const query = await searchParams
  const needsAttentionOnly = query.attention === 'true'
  const rows = await getProcurementInspectionQueue(actor)
  const attentionCount = rows.filter((item) => !item.readiness.finalized).length
  const visible = needsAttentionOnly ? rows.filter((item) => !item.readiness.finalized) : rows

  return <>
    <AdminPageHeader
      title="Inspection Readiness"
      text="Evidence checklist for recent seller-vehicle inspections. Review and finalize records through the existing authorized Sell Request workflow."
      breadcrumb="Procurement / Inspections"
      actions={<Link href="/admin/procurement" className="admin-button admin-button--secondary">Back to intake</Link>}
    />
    <form className="admin-filterbar" method="get">
      <label>Queue
        <select name="attention" defaultValue={needsAttentionOnly ? 'true' : 'false'}>
          <option value="false">All recent inspection records ({rows.length})</option>
          <option value="true">Needs attention ({attentionCount})</option>
        </select>
      </label>
      <button type="submit" className="admin-button">Apply</button>
    </form>
    <p>Reviewing at most the 100 most recent accessible inspection-stage requests. Counts on this screen apply only to this recent queue.</p>
    {visible.length ? <>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <caption>{visible.length} inspection-stage requests shown</caption>
          <thead><tr><th>Reference</th><th>Vehicle</th><th>Status</th><th>Evidence</th><th>Score</th><th>Assigned</th><th>Action</th></tr></thead>
          <tbody>
            {visible.map((item) => <tr key={item.id}>
              <td><strong>{item.referenceNumber}</strong></td>
              <td>{[item.year, item.make, item.model].filter(Boolean).join(' ') || 'Vehicle details pending'}</td>
              <td><AdminStatus value={item.status} /></td>
              <td>
                <strong>{item.readiness.finalized ? 'Finalized' : item.readiness.ready ? 'Ready for finalization' : 'Incomplete'}</strong>
                {item.readiness.missing.length ? <p>Missing: {item.readiness.missing.join(', ')}</p> : null}
                {item.readiness.advisories.map((note) => <p key={note}>{note}</p>)}
              </td>
              <td>{item.readiness.overallScore == null ? '—' : `${item.readiness.overallScore}/10`}</td>
              <td>{item.assignedTo?.name ?? 'Unassigned'}</td>
              <td><Link href={`/admin/sell-requests/${item.id}`}>Review</Link></td>
            </tr>)}
          </tbody>
        </table>
      </div>
      <div className="admin-mobile-cards">
        {visible.map((item) => <article className="admin-mobile-card" key={item.id}>
          <header><h2>{item.referenceNumber}</h2><AdminStatus value={item.status} /></header>
          <p>{[item.year, item.make, item.model].filter(Boolean).join(' ') || 'Vehicle details pending'}</p>
          <p>{item.readiness.finalized ? 'Finalized' : item.readiness.ready ? 'Ready for finalization' : `Missing: ${item.readiness.missing.join(', ')}`}</p>
          <footer><span>{item.assignedTo?.name ?? 'Unassigned'}</span><Link href={`/admin/sell-requests/${item.id}`}>Review</Link></footer>
        </article>)}
      </div>
    </> : <AdminEmpty title="No inspections in this queue" text="No accessible recent inspections match this filter." />}
  </>
}
