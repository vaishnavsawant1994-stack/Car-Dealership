import Link from 'next/link'
import { AdminEmpty, AdminPageHeader, AdminStatus } from '@/components/admin/AdminPrimitives'
import { myActiveShowrooms } from '@/lib/admin/showroom-service'
import { requirePermission } from '@/lib/auth/require-permission'

export default async function Page() {
  const actor = await requirePermission('dashboard.view')
  const assignments = await myActiveShowrooms(actor.id)
  return <>
    <AdminPageHeader title="My Showrooms" breadcrumb="Overview / My Showrooms"
      text="Your assigned active dealership locations. This screen does not grant access to other branches or staff management." />
    {assignments.length ? <div className="admin-grid">
      {assignments.map(({ showroom }) => <section className="admin-panel" key={showroom.id}>
        <header><h2>{showroom.name}</h2>{showroom.isPrimary ? <AdminStatus value="Primary" /> : null}</header>
        <div className="admin-panel__body">
          <p>{showroom.city}, {showroom.state}, {showroom.country}</p>
          <p style={{ color: 'var(--admin-muted)', fontSize: 13 }}>{showroom.hours}</p>
        </div>
      </section>)}
    </div> : <AdminEmpty title="No active showroom assignment"
      text="Ask a dealership administrator to assign your staff account to a showroom." />}
    <p style={{ marginTop: 20, fontSize: 13 }}><Link href="/admin">Back to dashboard</Link></p>
  </>
}
