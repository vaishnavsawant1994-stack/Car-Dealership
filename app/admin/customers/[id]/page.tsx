import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AdminEmpty, AdminPageHeader, AdminStatus } from '@/components/admin/AdminPrimitives'
import { requirePermission } from '@/lib/auth/require-permission'
import { getCustomer360 } from '@/lib/crm/customer-service'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission('user.view')
  const { id } = await params
  const result = await getCustomer360(id)
  if (!result) notFound()
  const { customer, inquiries, testDrives, sellRequests, favorites, messages } = result

  return <>
    <AdminPageHeader title={customer.name ?? 'Customer Profile'}
      text="Private registered-customer account history. No external notifications or account changes are performed from this screen."
      breadcrumb="Customer 360 / Profile"
      actions={<Link className="admin-button admin-button--secondary" href="/admin/customers">All customers</Link>} />
    <div className="admin-grid">
      <section className="admin-panel admin-panel--full">
        <header><h2>Customer account</h2><AdminStatus value={customer.status} /></header>
        <div className="admin-panel__body admin-kv">
          <div><small>Email</small><strong>{customer.email}</strong></div>
          <div><small>Phone</small><strong>{customer.phone ?? 'Not provided'}</strong></div>
          <div><small>City</small><strong>{customer.city ?? 'Not provided'}</strong></div>
          <div><small>Preferred contact</small><strong>{customer.preferredContactMethod}</strong></div>
          <div><small>Email verification</small><strong>{customer.emailVerified ? 'Verified' : 'Not verified'}</strong></div>
          <div><small>Marketing email consent</small><strong>{customer.notificationSettings?.marketingEmails ? 'Consented' : 'Not consented'}</strong></div>
          <div><small>Created</small><strong>{customer.createdAt.toLocaleString('en-IN')}</strong></div>
          <div><small>Last login</small><strong>{customer.lastLoginAt?.toLocaleString('en-IN') ?? 'None recorded'}</strong></div>
        </div>
      </section>
      <section className="admin-panel admin-panel--full">
        <header><h2>Recorded relationships</h2></header>
        <div className="admin-panel__body admin-kv">
          <div><small>Enquiries</small><strong>{customer._count.inquiries}</strong></div>
          <div><small>Test drives</small><strong>{customer._count.testDrives}</strong></div>
          <div><small>Sell requests</small><strong>{customer._count.sellRequests}</strong></div>
          <div><small>Saved vehicles</small><strong>{customer._count.favorites}</strong></div>
        </div>
        <div className="admin-panel__body">
          <p>Only records explicitly linked to this user ID are shown; matching guest email addresses are not treated as proof of identity.</p>
        </div>
      </section>
      <section className="admin-panel admin-panel--full">
        <header><h2>Enquiries</h2></header>
        {inquiries.length ? <div className="admin-list">{inquiries.map((item) =>
          <Link key={item.id} href={`/admin/enquiries/${item.id}`}>
            <div><h3>{item.referenceNumber}</h3><p>{item.vehicle?.shortTitle ?? 'General enquiry'} · {item.submittedAt.toLocaleDateString('en-IN')}</p></div>
            <AdminStatus value={item.status}/></Link>)}</div> :
          <AdminEmpty title="No account-linked enquiries" text="No enquiries are linked to this registered account."/>}
      </section>
      <section className="admin-panel admin-panel--full">
        <header><h2>Test drives</h2></header>
        {testDrives.length ? <div className="admin-list">{testDrives.map((item) =>
          <Link key={item.id} href={`/admin/test-drives/${item.id}`}>
            <div><h3>{item.referenceNumber}</h3><p>{item.vehicle.shortTitle} · {item.preferredDate.toLocaleDateString('en-IN')} {item.preferredTime}</p></div>
            <AdminStatus value={item.status}/></Link>)}</div> :
          <AdminEmpty title="No account-linked test drives" text="Test drive activity will appear here."/>}
      </section>
      <section className="admin-panel admin-panel--full">
        <header><h2>Sell requests</h2></header>
        {sellRequests.length ? <div className="admin-list">{sellRequests.map((item) =>
          <Link key={item.id} href={`/admin/sell-requests/${item.id}`}>
            <div><h3>{item.referenceNumber}</h3><p>{[item.year, item.make, item.model].filter(Boolean).join(' ') || 'Vehicle details pending'}</p></div>
            <AdminStatus value={item.status}/></Link>)}</div> :
          <AdminEmpty title="No account-linked sell requests" text="Seller intake activity will appear here."/>}
      </section>
      <section className="admin-panel admin-panel--full">
        <header><h2>Saved vehicles</h2></header>
        {favorites.length ? <div className="admin-list">{favorites.map((item) =>
          <Link key={item.vehicle.id} href={`/admin/vehicles/${item.vehicle.id}`}>
            <div><h3>{item.vehicle.shortTitle}</h3><p>{item.vehicle.stockNumber} · Saved {item.createdAt.toLocaleDateString('en-IN')}</p></div>
            <AdminStatus value={item.vehicle.status}/></Link>)}</div> :
          <AdminEmpty title="No saved vehicles" text="No vehicles have been saved by this account."/>}
      </section>
      <section className="admin-panel admin-panel--full">
        <header><h2>Customer-visible conversation history</h2></header>
        <div className="admin-panel__body admin-timeline">
          {messages.length ? messages.map((item) => <article key={item.id}>
            <strong>{item.sentByCustomer ? 'Customer' : 'Staff update'}</strong>
            <p>{item.body}</p>
            <time>{item.createdAt.toLocaleString('en-IN')}</time>
          </article>) : <p>No customer-visible messages are linked to this account.</p>}
        </div>
      </section>
    </div>
  </>
}
