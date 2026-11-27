'use client'

import Link from 'next/link'
import { LoaderCircle, RefreshCw, UserMinus, UserPlus } from 'lucide-react'
import { useState, type FormEvent } from 'react'

type Person = { id: string; name: string | null; email: string; role: string; status?: string }
type Roster = {
  showroom: { id: string; name: string; active: boolean; isPrimary: boolean }
  assignments: Array<{ userId: string; createdAt: string | Date; user: Person }>
  candidates: Person[]
}
type ApiResponse = { data?: Roster; message?: string; error?: { message?: string; code?: string } }

export function ShowroomStaffManager({ initial }: { initial: Roster }) {
  const [roster, setRoster] = useState(initial)
  const [selected, setSelected] = useState('')
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null)
  const assigned = new Set(roster.assignments.map((a) => a.userId))
  const eligible = roster.candidates.filter((u) => !assigned.has(u.id) &&
    [u.name ?? '', u.email, u.role].some((v) => v.toLowerCase().includes(search.toLowerCase())))

  async function refresh() {
    const response = await fetch('/api/admin/showrooms/' + encodeURIComponent(initial.showroom.id) + '/staff', {
      cache: 'no-store',
    })
    const data = (await response.json()) as ApiResponse
    if (!response.ok || !data.data) throw new Error(data.error?.message ?? 'Could not refresh staff roster.')
    setRoster(data.data)
  }

  async function operate(method: 'POST' | 'DELETE', userId: string) {
    if (busy || !userId) return
    setBusy(true)
    setNotice(null)
    const base = '/api/admin/showrooms/' + encodeURIComponent(initial.showroom.id) + '/staff'
    try {
      const response = await fetch(method === 'POST' ? base : base + '/' + encodeURIComponent(userId), {
        method,
        headers: { 'Content-Type': 'application/json' },
        ...(method === 'POST' ? { body: JSON.stringify({ userId }) } : {}),
      })
      const result = (await response.json()) as ApiResponse
      if (!response.ok) {
        setNotice({ text: result.error?.message ?? 'The assignment could not be changed.', error: true })
        return
      }
      setSelected('')
      await refresh()
      setNotice({
        text: method === 'POST' ? 'Staff member assigned to the showroom.' : 'Staff assignment removed.',
        error: false,
      })
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : 'Network error.', error: true })
    } finally {
      setBusy(false)
    }
  }

  function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void operate('POST', selected)
  }

  return (
    <div className="admin-detail-layout">
      <div className="admin-detail-stack">
        <section className="admin-panel admin-panel--full">
          <header><h2>Assigned staff ({roster.assignments.length})</h2>
            <button className="admin-button admin-button--secondary" type="button" disabled={busy}
              onClick={() => { void refresh().catch((err: unknown) => setNotice({
                text: err instanceof Error ? err.message : 'Refresh failed.', error: true,
              })) }}>
              <RefreshCw aria-hidden="true" /> Refresh
            </button>
          </header>
          {roster.assignments.length ? <div className="admin-list">
            {roster.assignments.map(({ user, userId, createdAt }) => (
              <article key={userId}>
                <div>
                  <h3>{user.name || 'Unnamed staff member'}</h3>
                  <p>{user.email} · {user.role.replaceAll('_', ' ')} · {user.status}</p>
                  <p>Assigned {new Date(createdAt).toLocaleDateString('en-IN')}</p>
                </div>
                <button type="button" className="admin-button admin-button--danger" disabled={busy}
                  onClick={() => void operate('DELETE', userId)}
                  aria-label={'Remove ' + (user.name || user.email) + ' from showroom'}>
                  <UserMinus aria-hidden="true" /> Remove
                </button>
              </article>
            ))}
          </div> : <div className="admin-empty">
            <h2>No staff assigned</h2>
            <p>Use the assignment form to connect active fictional staff to this showroom.</p>
          </div>}
        </section>
      </div>
      <aside className="admin-detail-stack">
        <section className="admin-panel admin-panel--full">
          <header><h2>Assign staff member</h2></header>
          <div className="admin-panel__body">
            <form className="admin-form" onSubmit={add}>
              <label>Find eligible staff
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, role or email" disabled={busy || !roster.showroom.active} />
              </label>
              <label>Staff member
                <select value={selected} onChange={(e) => setSelected(e.target.value)}
                  disabled={busy || !roster.showroom.active} required>
                  <option value="">Select a person</option>
                  {eligible.map((person) =>
                    <option key={person.id} value={person.id}>
                      {(person.name || person.email) + ' — ' + person.role.replaceAll('_', ' ')}
                    </option>)}
                </select>
              </label>
              <p style={{ color: 'var(--admin-muted)', fontSize: 12 }}>
                {roster.showroom.active
                  ? 'Only active staff accounts can be assigned. Customer and Super Admin accounts are excluded.'
                  : 'This branch is inactive. Activate it before assigning staff.'}
              </p>
              <button className="admin-button" type="submit" disabled={!selected || busy || !roster.showroom.active}>
                {busy ? <LoaderCircle aria-hidden="true" /> : <UserPlus aria-hidden="true" />}
                Assign to branch
              </button>
            </form>
          </div>
        </section>
        <section className="admin-panel admin-panel--full">
          <header><h2>Management rules</h2></header>
          <div className="admin-panel__body" style={{ display: 'grid', gap: 12, fontSize: 13 }}>
            <p>Staff may have multiple showroom assignments. This link does not grant extra admin permissions or give access to another branch&apos;s private records.</p>
            <p>Deactivation requires removing branch assignments first. All assignment changes create audit events.</p>
            <Link className="admin-button admin-button--secondary" href="/admin/showrooms">Back to showrooms</Link>
          </div>
        </section>
        {notice ? <p className={'admin-form-message' + (notice.error ? ' is-error' : '')}
          role="status" aria-live="polite">{notice.text}</p> : null}
      </aside>
    </div>
  )
}
