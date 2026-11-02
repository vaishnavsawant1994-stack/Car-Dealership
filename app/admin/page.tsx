import { CalendarCheck, CarFront, Inbox, MessageSquareText } from 'lucide-react'
import Link from 'next/link'
import { AdminMetric, AdminPageHeader, AdminStatus } from '@/components/admin/AdminPrimitives'
import { getAdminDashboard, resolveDashboardRange, type DashboardRange } from '@/lib/admin/dashboard'
import { requirePermission } from '@/lib/auth/require-permission'
import { hasPermission } from '@/lib/auth/admin-permissions'
import { adminDateRangeSchema } from '@/lib/validation/admin'

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requirePermission('dashboard.view')
  const query = await searchParams
  const parsed = adminDateRangeSchema.safeParse({ range: query.range ?? '7d', from: query.from, to: query.to })
  const selected = parsed.success ? parsed.data : { range: '7d' as const }
  const period = resolveDashboardRange(selected.range as DashboardRange, selected.from, selected.to)
  const data = await getAdminDashboard({ ...period, actorId: actor.id, actorRole: actor.role })
  return <>
    <AdminPageHeader title="Operations Dashboard" text="Live inventory, customer operations and team actions from PostgreSQL." actions={<form className="admin-filterbar" style={{ margin: 0, padding: 0, border: 0, background: 'transparent' }}><label>Date range<select name="range" defaultValue={selected.range}><option value="today">Today</option><option value="7d">Last 7 Days</option><option value="30d">Last 30 Days</option><option value="month">Current Month</option><option value="custom">Custom</option></select></label>{selected.range === 'custom' ? <><label>From<input name="from" type="date" defaultValue={query.from} /></label><label>To<input name="to" type="date" defaultValue={query.to} /></label></> : null}<button className="admin-button admin-button--secondary">Apply</button></form>} />
    {query.forbidden ? <p className="admin-form-message is-error" role="alert">Your role does not include the requested permission.</p> : null}
    <section className="admin-metrics" aria-label="Operational totals">
      <AdminMetric label="Available vehicles" value={data.inventory.available} helper={`${data.inventory.reserved} currently reserved`} icon={CarFront} />
      <AdminMetric label="New enquiries" value={data.operations.newEnquiries} helper={`${data.operations.followUpEnquiries} require follow-up`} icon={MessageSquareText} />
      <AdminMetric label="Upcoming test drives" value={data.operations.upcomingDrives} helper={`${data.operations.pendingDrives} requests in selected period`} icon={CalendarCheck} />
      <AdminMetric label="Open contact messages" value={data.operations.openContacts} helper={`${data.operations.newSellRequests} sell requests in period`} icon={Inbox} />
    </section>
    <section className="admin-grid">
      <article className="admin-panel admin-panel--wide"><header><h2>Recent enquiries</h2><Link href="/admin/enquiries">View all</Link></header><div className="admin-list">{data.recentEnquiries.map((item) => <Link href={`/admin/enquiries/${item.id}`} key={item.id}><div><h3>{item.referenceNumber} · {item.vehicle?.shortTitle ?? 'General enquiry'}</h3><p>{item.fullName} · {item.assignedTo?.name ?? 'Unassigned'}</p></div><AdminStatus value={item.status} /></Link>)}</div></article>
      <article className="admin-panel admin-panel--narrow"><header><h2>Today&apos;s actions</h2></header><div className="admin-panel__body admin-kv"><div><small>Assigned to you</small><strong>{data.team.assignedWork}</strong></div><div><small>Overdue</small><strong>{data.team.overdueWork}</strong></div><div><small>Inspection queue</small><strong>{data.operations.inspections}</strong></div><div><small>Incomplete images</small><strong>{data.inventory.incompleteImages}</strong></div></div></article>
      <article className="admin-panel"><header><h2>Upcoming test drives</h2><Link href="/admin/test-drives">Schedule</Link></header><div className="admin-list">{data.drives.map((item) => <Link href={`/admin/test-drives/${item.id}`} key={item.id}><div><h3>{item.vehicle.shortTitle}</h3><p>{item.fullName} · {item.preferredDate.toLocaleDateString('en-IN')} {item.preferredTime}</p></div><AdminStatus value={item.status} /></Link>)}</div></article>
      <article className="admin-panel"><header><h2>Inventory & content alerts</h2></header><div className="admin-panel__body admin-kv"><div><small>Draft vehicles</small><strong>{data.inventory.drafts}</strong></div><div><small>Sold vehicles</small><strong>{data.inventory.sold}</strong></div><div><small>Draft testimonials</small><strong>{data.content.draftTestimonials}</strong></div><div><small>Draft gallery items</small><strong>{data.content.draftGallery}</strong></div></div></article>
      {hasPermission(actor.role, 'auditLog.view') ? <article className="admin-panel admin-panel--full"><header><h2>Recent staff activity</h2><Link href="/admin/audit-logs">Audit log</Link></header><div className="admin-list">{data.audit.map((item) => <article key={item.id}><div><h3>{item.summary ?? item.action}</h3><p>{item.actor?.name ?? 'System'} · {item.createdAt.toLocaleString('en-IN')}</p></div><AdminStatus value={item.action.replace('SEED_ADMIN_', '')} /></article>)}</div></article> : null}
    </section>
  </>
}
