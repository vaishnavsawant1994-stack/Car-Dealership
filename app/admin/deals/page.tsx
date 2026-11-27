import Link from 'next/link'
import { AdminEmpty, AdminPageHeader, AdminStatus } from '@/components/admin/AdminPrimitives'
import { SalesDealLifecycleControls } from '@/components/admin/SalesDealLifecycleControls'
import { requirePermission } from '@/lib/auth/require-permission'
import { SalesDealStatus } from '@prisma/client'
import { listSalesDeals } from '@/lib/sales/deal-service'

export default async function Page({ searchParams }: {
  searchParams: Promise<{ status?: string }>
}) {
  const actor = await requirePermission('enquiry.view')
  const query = await searchParams
  const status = query.status && Object.values(SalesDealStatus).includes(query.status as SalesDealStatus)
    ? query.status as SalesDealStatus : undefined
  const deals = await listSalesDeals(actor, status)
  return <>
    <AdminPageHeader title="Sales Deals"
      text="Internal deal tracking from an indicative quote. Recording a won status does not reserve or sell a vehicle, issue an invoice, collect payment, or schedule delivery."
      breadcrumb="Sales / Deals" />
    <form className="admin-filterbar" method="get">
      <label>Status
        <select name="status" defaultValue={status ?? ''}>
          <option value="">All statuses</option>
          {Object.values(SalesDealStatus).map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}
        </select>
      </label>
      <button className="admin-button" type="submit">Filter</button>
    </form>
    <p>{deals.length} deals shown. Staff see only records permitted by their showroom and assignment scope.</p>
    {deals.length ? <>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <caption>{deals.length} internal sales deals</caption>
          <thead><tr><th>Deal</th><th>Enquiry</th><th>Customer</th><th>Vehicle</th><th>Indicative quote</th><th>Status</th><th>Updated</th><th>Lifecycle</th></tr></thead>
          <tbody>{deals.map((deal) => <tr key={deal.id}>
            <td><strong>{deal.referenceNumber}</strong><details><summary>History ({deal.events.length})</summary><div className="admin-timeline">
              {deal.events.map((event) => <article key={event.id}>
                <strong>{event.fromStatus ? `${event.fromStatus.replaceAll('_', ' ')} → ` : ''}{event.toStatus.replaceAll('_', ' ')}</strong>
                {event.acceptanceMethod ? <p>Acceptance evidence recorded: {event.acceptanceMethod.replaceAll('_', ' ').toLowerCase()}</p> : null}
                {event.lossReason ? <p>Outcome: {event.lossReason.replaceAll('_', ' ').toLowerCase()}</p> : null}
                <time>{event.actor.name ?? 'Authorized staff'} · {event.createdAt.toLocaleString('en-IN')}</time>
              </article>)}
            </div></details></td>
            <td><Link href={`/admin/enquiries/${deal.inquiryId}`}>{deal.inquiry.referenceNumber}</Link></td>
            <td>{deal.inquiry.fullName}</td>
            <td><Link href={`/admin/vehicles/${deal.vehicle.id}`}>{deal.vehicle.shortTitle}</Link><small> · {deal.vehicle.stockNumber}</small></td>
            <td>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: deal.quoteDraft.currency, maximumFractionDigits: 0 }).format(deal.quoteDraft.estimatedSubtotal)}<small> · indicative, before final finance review</small></td>
            <td><AdminStatus value={deal.status} /></td>
            <td><time dateTime={deal.updatedAt.toISOString()}>{deal.updatedAt.toLocaleDateString('en-IN')}</time></td>
            <td><SalesDealLifecycleControls id={deal.id} status={deal.status} version={deal.version} /></td>
          </tr>)}</tbody>
        </table>
      </div>
      <div className="admin-mobile-cards">{deals.map((deal) => <article className="admin-mobile-card" key={deal.id}>
        <header><h2>{deal.referenceNumber}</h2><AdminStatus value={deal.status} /></header>
        <p>{deal.inquiry.fullName} · {deal.inquiry.referenceNumber}</p>
        <p>{deal.vehicle.shortTitle} · {deal.vehicle.stockNumber}</p>
        <p>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: deal.quoteDraft.currency, maximumFractionDigits: 0 }).format(deal.quoteDraft.estimatedSubtotal)} indicative</p>
        <SalesDealLifecycleControls id={deal.id} status={deal.status} version={deal.version} />
      </article>)}</div>
    </> : <AdminEmpty title="No matching deals" text="Start an internal deal from a current quote worksheet on an enquiry." />}
  </>
}
