import { AdminPageHeader } from '@/components/admin/AdminPrimitives'
import { requirePermission } from '@/lib/auth/require-permission'
import { getShowroomAnalytics } from '@/lib/analytics/analytics-service'

export default async function AnalyticsPage() {
  const actor = await requirePermission('analytics.view')
  const report = await getShowroomAnalytics(actor)
  const sections = [
    ['Sales deals · last 30 days', report.salesDeals],
    ['Delivery cases', report.deliveries],
    ['Workshop orders', report.workshopOrders],
    ['After-sales tasks', report.afterSalesTasks],
  ] as const
  return <>
    <AdminPageHeader title="Operations Analytics" text="Showroom scoped activity counts. Customer details and financial totals are excluded." breadcrumb="Overview / Analytics" />
    <div className="admin-grid">{sections.map(([title, rows]) => <section className="admin-panel" key={title}><header><h2>{title}</h2></header><div className="admin-panel__body">{rows.length ? <dl>{rows.map(({ status, count }) => <div key={status} style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}><dt>{status.replaceAll('_', ' ')}</dt><dd>{count}</dd></div>)}</dl> : <p>No activity in scope.</p>}</div></section>)}</div>
  </>
}
