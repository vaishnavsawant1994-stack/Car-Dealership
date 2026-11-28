import Link from 'next/link'
import { UserRole } from '@prisma/client'
import { notFound } from 'next/navigation'
import { AdminPageHeader, AdminStatus } from '@/components/admin/AdminPrimitives'
import { canManageUser } from '@/lib/auth/admin-resource-policy'
import { hasPermission } from '@/lib/auth/admin-permissions'
import { requirePermission } from '@/lib/auth/require-permission'
import { prisma } from '@/lib/db/prisma'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePermission('user.view')
  const { id } = await params
  const user = await prisma.user.findFirst({
    where: { id, role: { not: UserRole.CUSTOMER }, deletedAt: null },
    select: {
      id: true, name: true, email: true, phone: true, role: true, status: true,
      emailVerified: true, lastLoginAt: true, createdAt: true,
      sessionVersion: true,
      showroomAssignments: { select: { createdAt: true, showroom: {
        select: { id: true, name: true, city: true, state: true, active: true },
      } } },
      sessions: { select: { expires: true }, orderBy: { expires: 'desc' } },

    },
  })
  if (!user) notFound()
  // Events targeting this account, not arbitrary actions authored by the user.
  const accountActivity = await prisma.auditLog.findMany({
    where: { resourceType: 'User', resourceId: user.id },
    take: 12, orderBy: { createdAt: 'desc' },
    select: { id: true, action: true, summary: true, createdAt: true },
  })
  const canManageShowrooms = hasPermission(actor.role, 'showroom.manage')
  const canManage = canManageUser(actor, user)
  return <>
    <AdminPageHeader
      title={user.name ?? user.email}
      text={user.email}
      breadcrumb="Management / Staff / Detail"
      actions={<AdminStatus value={user.status} />}
    />
    <div className="admin-detail-layout">
      <div className="admin-detail-stack">
        <section className="admin-panel admin-panel--full">
          <header><h2>Staff account</h2></header>
          <div className="admin-kv">
            <div><small>Role</small><strong>{user.role.replaceAll('_', ' ')}</strong></div>
            <div><small>Status</small><strong>{user.status.replaceAll('_', ' ')}</strong></div>
            <div><small>Verified</small><strong>{user.emailVerified ? 'Yes' : 'No'}</strong></div>
            <div><small>Last login</small><strong>{user.lastLoginAt?.toLocaleString('en-IN') ?? 'Never'}</strong></div>
            <div><small>Phone</small><strong>{user.phone ?? 'Not provided'}</strong></div>
            <div><small>Created</small><strong>{user.createdAt.toLocaleString('en-IN')}</strong></div>
          </div>
          <div className="admin-panel__body">
            {actor.id === user.id ?
              <Link className="admin-button admin-button--secondary" href="/admin/profile">Edit my own profile</Link> :
              <p style={{ color: 'var(--admin-muted)', fontSize: 13 }}>
                {canManage && hasPermission(actor.role, 'user.update')
                  ? 'Role and account status can be managed from the staff directory.'
                  : 'This account is protected from your role.'}
              </p>}
          </div>
        </section>
        <section className="admin-panel admin-panel--full">
          <header><h2>Branch assignments</h2></header>
          <div className="admin-panel__body">
            {user.showroomAssignments.length ? <div className="admin-list">
              {user.showroomAssignments.map(({ showroom, createdAt }) => <article key={showroom.id}>
                <div>
                  <h3>{showroom.name}</h3>
                  <p>{showroom.city}, {showroom.state} · {showroom.active ? 'Active' : 'Inactive'}</p>
                  <p>Assigned {createdAt.toLocaleDateString('en-IN')}</p>
                </div>
                {canManageShowrooms ? <Link href={'/admin/showrooms/' + showroom.id + '/staff'}>
                  Manage roster
                </Link> : null}
              </article>)}
            </div> : <p>No branch assignment. A showroom manager can add one from the showroom roster.</p>}
          </div>
        </section>
        <section className="admin-panel admin-panel--full">
          <header><h2>Recent account activity</h2></header>
          <div className="admin-panel__body admin-timeline">
            {accountActivity.length ? accountActivity.map((log) => <article key={log.id}>
              <strong>{log.action.replaceAll('_', ' ')}</strong>
              <p>{log.summary ?? 'Staff account event'}</p>
              <time dateTime={log.createdAt.toISOString()}>{log.createdAt.toLocaleString('en-IN')}</time>
            </article>) : <p>No staff account activity has been recorded.</p>}
          </div>
        </section>
      </div>
      <aside className="admin-detail-stack">
        <section className="admin-panel admin-panel--full">
          <header><h2>Sessions and security</h2></header>
          <div className="admin-panel__body admin-timeline">
            <p>Current session generation: {user.sessionVersion}</p>
            {user.sessions.length ? user.sessions.map((session, index) => <article key={index}>
              <strong>Stored session</strong><p>Expires {session.expires.toLocaleString('en-IN')}</p>
            </article>) : <p>No database sessions. JWT sessions are invalidated on lifecycle changes.</p>}
            {hasPermission(actor.role, 'session.revoke') && (canManage || actor.id === user.id)
              ? <p><Link href="/admin/users">Revoke sessions from the staff directory</Link></p>
              : null}
          </div>
        </section>
      </aside>
    </div>
  </>
}
