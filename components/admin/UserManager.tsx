'use client'

import Link from 'next/link'
import { LoaderCircle, RotateCcw, ShieldAlert } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { AdminStatus } from './AdminPrimitives'

export type DirectoryUser = {
  id: string; name: string | null; email: string; role: string; status: string
  emailVerified: string | null; lastLoginAt: string | null; createdAt: string
  sessionCount: number; sessionVersion: number
  canEdit: boolean; canChangeRole: boolean; canRevokeSessions: boolean
  showrooms: { id: string; name: string; active: boolean }[]
}

const roles = ['SALES', 'OPERATIONS', 'CONTENT_MANAGER', 'ADMIN', 'SUPER_ADMIN']
const statuses = ['ACTIVE', 'SUSPENDED', 'DISABLED']

export function UserManager({ users }: { users: DirectoryUser[] }) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ message: string; error: boolean } | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('ALL')

  const visible = useMemo(() => users.filter((user) => {
    const text = [user.name ?? '', user.email, user.role,
      ...user.showrooms.map((item) => item.name)].join(' ').toLowerCase()
    return text.includes(query.trim().toLowerCase()) &&
      (filter === 'ALL' || user.status === filter)
  }), [users, query, filter])

  async function mutate(user: DirectoryUser, payload: { role?: string; status?: string }) {
    if (busyId || !user.canEdit) return
    const change = payload.status ?? payload.role
    const description = payload.status ? 'change the account status' : 'change this staff role'
    if (!window.confirm('Confirm you want to ' + description + ' to ' + change + '? Existing sessions will be revoked.')) return
    setBusyId(user.id)
    setNotice(null)
    try {
      const response = await fetch('/api/admin/users/' + encodeURIComponent(user.id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, version: user.sessionVersion }),
      })
      const result = await response.json()
      setNotice({ message: result.message ?? result.error?.message ?? 'Operation failed.', error: !response.ok })
      if (response.ok) router.refresh()
    } catch {
      setNotice({ message: 'Network error; nothing has been changed.', error: true })
    } finally { setBusyId(null) }
  }

  async function revoke(user: DirectoryUser) {
    if (busyId || !user.canRevokeSessions) return
    if (!window.confirm('Revoke all login sessions for ' + user.email + '?')) return
    setBusyId(user.id)
    setNotice(null)
    try {
      const response = await fetch('/api/admin/users/' + encodeURIComponent(user.id) + '/revoke-sessions',
        { method: 'POST' })
      const result = await response.json()
      setNotice({ message: result.message ?? result.error?.message ?? 'Operation failed.', error: !response.ok })
      if (response.ok) router.refresh()
    } catch {
      setNotice({ message: 'Network error; session revocation was not verified.', error: true })
    } finally { setBusyId(null) }
  }

  return <>
    <section className="admin-filterbar" aria-label="Staff directory filters">
      <label className="admin-filterbar__search">Search staff and assigned showrooms
        <input value={query} onChange={(event) => setQuery(event.target.value)}
          placeholder="Name, email, role or branch" />
      </label>
      <label>Status
        <select value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="ALL">All statuses</option>
          {['ACTIVE', 'SUSPENDED', 'DISABLED', 'PENDING_VERIFICATION'].map((status) =>
            <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}
        </select>
      </label>
      <span style={{ color: 'var(--admin-muted)', fontSize: 12, alignSelf: 'center' }}>
        {visible.length} of {users.length} staff accounts
      </span>
    </section>
    {notice ? <p className={'admin-form-message' + (notice.error ? ' is-error' : '')}
      role="status" aria-live="polite">{notice.message}</p> : null}
    <div className="admin-table-wrap">
      <table className="admin-table">
        <caption>Staff directory — no customer accounts or credentials are displayed.</caption>
        <thead><tr><th>Staff member</th><th>Role</th><th>Account status</th>
          <th>Showrooms</th><th>Verified</th><th>Sessions</th><th>Actions</th></tr></thead>
        <tbody>
          {visible.map((user) => <tr key={user.id}>
            <td><Link href={'/admin/users/' + encodeURIComponent(user.id)}>
              <strong>{user.name ?? 'Unnamed staff'}</strong><small style={{ display: 'block' }}>{user.email}</small>
            </Link></td>
            <td>{user.canChangeRole ? <select value={user.role} disabled={Boolean(busyId)}
              aria-label={'Change role for ' + user.email}
              onChange={(event) => void mutate(user, { role: event.target.value })}>
              {roles.map((role) => <option key={role} value={role}>{role.replaceAll('_', ' ')}</option>)}
            </select> : user.role.replaceAll('_', ' ')}</td>
            <td>{user.canEdit ? <select value={user.status} disabled={Boolean(busyId)}
              aria-label={'Change status for ' + user.email}
              onChange={(event) => void mutate(user, { status: event.target.value })}>
              {user.status === 'PENDING_VERIFICATION' ? <option value="PENDING_VERIFICATION">Pending verification</option> : null}
              {statuses.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}
            </select> : <AdminStatus value={user.status} />}</td>
            <td><span>{user.showrooms.filter((s) => s.active).map((s) => s.name).join(', ') || 'Unassigned'}</span></td>
            <td>{user.emailVerified ? 'Yes' : 'No'}</td>
            <td>{user.sessionCount}</td>
            <td>{user.canRevokeSessions ? <button type="button" className="admin-button admin-button--secondary"
              disabled={Boolean(busyId)} onClick={() => void revoke(user)}>
              {busyId === user.id ? <LoaderCircle aria-hidden="true" /> : <RotateCcw aria-hidden="true" />}
              Revoke sessions
            </button> : <span style={{ color: 'var(--admin-muted)' }}>Protected</span>}</td>
          </tr>)}
        </tbody>
      </table>
    </div>
    <div className="admin-mobile-cards">
      {visible.map((user) => <article key={user.id} className="admin-mobile-card">
        <header><h2>{user.name ?? user.email}</h2><AdminStatus value={user.status} /></header>
        <p>{user.email}<br />{user.role.replaceAll('_', ' ')} · {user.sessionCount} sessions</p>
        <p>Showrooms: {user.showrooms.filter((s) => s.active).map((s) => s.name).join(', ') || 'Unassigned'}</p>
        <footer><Link href={'/admin/users/' + encodeURIComponent(user.id)}>Staff details</Link>
          {user.canRevokeSessions ? <button className="admin-button admin-button--secondary"
            type="button" disabled={Boolean(busyId)} onClick={() => void revoke(user)}>
            <ShieldAlert aria-hidden="true" /> Revoke
          </button> : null}
        </footer>
      </article>)}
    </div>
    {!visible.length ? <div className="admin-empty">
      <h2>No staff members match</h2>
      <p>Clear filters to see other eligible staff accounts.</p>
    </div> : null}
  </>
}
