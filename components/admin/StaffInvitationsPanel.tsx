'use client'

import { LoaderCircle, Send, ShieldAlert, UserX } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { AdminStatus } from './AdminPrimitives'

type Invitation = {
  id: string; email: string; role: string
  createdAt: string; expiresAt: string
  usedAt: string | null; revokedAt: string | null
}

function invitationState(item: Invitation) {
  if (item.usedAt) return 'ACCEPTED'
  if (item.revokedAt) return 'REVOKED'
  if (new Date(item.expiresAt).getTime() <= Date.now()) return 'EXPIRED'
  return 'PENDING'
}

export function StaffInvitationsPanel({ invitations, canInviteAdmin, hostedDemo }: {
  invitations: Invitation[]; canInviteAdmin: boolean; hostedDemo: boolean
}) {
  const router = useRouter()
  const [items, setItems] = useState(invitations)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ message: string; error: boolean } | null>(null)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('SALES')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  async function refresh() {
    const response = await fetch('/api/admin/staff-invitations', { cache: 'no-store' })
    const body = await response.json()
    if (!response.ok) throw new Error(body.error?.message ?? 'Unable to refresh invitations.')
    setItems(body.data)
  }

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || hostedDemo) return
    setBusy(true); setNotice(null); setPreviewUrl(null)
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      })
      const body = await response.json()
      setNotice({ message: body.message ?? body.error?.message ?? 'Unable to issue invitation.',
        error: !response.ok })
      if (response.ok) {
        setEmail('')
        // Only local development previews expose a one-time link.
        if (typeof body.data?.previewUrl === 'string') setPreviewUrl(body.data.previewUrl)
        await refresh()
        router.refresh()
      }
    } catch {
      setNotice({ message: 'Network error; invitation delivery not verified.', error: true })
    } finally { setBusy(false) }
  }

  async function revoke(item: Invitation) {
    if (busy || !window.confirm('Revoke this pending invitation for ' + item.email + '?')) return
    setBusy(true); setNotice(null)
    try {
      const response = await fetch('/api/admin/staff-invitations/' + encodeURIComponent(item.id) + '/revoke', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
      })
      const body = await response.json()
      setNotice({ message: body.message ?? body.error?.message ?? 'Unable to revoke invitation.',
        error: !response.ok })
      if (response.ok) { await refresh(); router.refresh() }
    } catch {
      setNotice({ message: 'Network error; revocation not verified.', error: true })
    } finally { setBusy(false) }
  }

  return <div className="admin-detail-layout">
    <div className="admin-detail-stack">
      <section className="admin-panel admin-panel--full">
        <header><h2>Recent invitations</h2><span>{items.length} records</span></header>
        {items.length ? <div className="admin-list">
          {items.map((invitation) => {
            const status = invitationState(invitation)
            return <article key={invitation.id}>
              <div>
                <h3>{invitation.email}</h3>
                <p>{invitation.role.replaceAll('_', ' ')} · Expires {new Date(invitation.expiresAt).toLocaleString('en-IN')}</p>
                <AdminStatus value={status} />
              </div>
              {status === 'PENDING' && (invitation.role !== 'ADMIN' || canInviteAdmin)
                ? <button type="button" className="admin-button admin-button--danger"
                  disabled={busy} onClick={() => void revoke(invitation)}>
                  <UserX aria-hidden="true" /> Revoke
                </button> : null}
            </article>
          })}
        </div> : <div className="admin-empty">
          <h2>No invitations</h2>
          <p>Create an invitation in an approved non-hosted environment or review past invitations here.</p>
        </div>}
      </section>
    </div>
    <aside className="admin-detail-stack">
      <section className="admin-panel admin-panel--full">
        <header><h2>Invite staff</h2></header>
        <div className="admin-panel__body">
          {hostedDemo ? <p className="admin-form-message is-error" role="status">
            <ShieldAlert aria-hidden="true" /> Staff invitations are disabled in protected staging/demo.
            Do not create real identities or enable external messaging.
          </p> : <form className="admin-form" onSubmit={invite}>
            <label>Email address
              <input name="email" type="email" required value={email} disabled={busy}
                onChange={(event) => setEmail(event.target.value)} autoComplete="off" />
            </label>
            <label>Staff role
              <select name="role" value={role} onChange={(event) => setRole(event.target.value)} disabled={busy}>
                {['SALES', 'OPERATIONS', 'CONTENT_MANAGER', ...(canInviteAdmin ? ['ADMIN'] : [])].map((value) =>
                  <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}
              </select>
            </label>
            <p style={{ color: 'var(--admin-muted)', fontSize: 13 }}>
              Invitations are single-use and expire after 48 hours. Staff choose their own password.
            </p>
            <button className="admin-button" disabled={busy} type="submit">
              {busy ? <LoaderCircle aria-hidden="true" /> : <Send aria-hidden="true" />} Create invitation
            </button>
          </form>}
          {previewUrl ? <p className="admin-form-message">
            Local development only: <a href={previewUrl}>Open the one-time invitation</a>.
            Never share this link in a hosted deployment.
          </p> : null}
          {notice ? <p className={'admin-form-message' + (notice.error ? ' is-error' : '')}
            role="status" aria-live="polite">{notice.message}</p> : null}
        </div>
      </section>
    </aside>
  </div>
}
