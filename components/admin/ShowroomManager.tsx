'use client'

import Link from 'next/link'
import { LoaderCircle, Save, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { AdminStatus } from './AdminPrimitives'

export type BranchItem = {
  id: string
  name: string
  address: string
  city: string
  state: string
  postalCode: string
  country: string
  latitude: string | null
  longitude: string | null
  phone: string
  email: string
  whatsapp: string | null
  hours: string
  mapUrl: string | null
  active: boolean
  isPrimary: boolean
  version: number
  _count?: { staffAssignments: number }
}

export function ShowroomManager({ items, initialId }: { items: BranchItem[]; initialId?: string }) {
  const router = useRouter()
  const [editing, setEditing] = useState<BranchItem | null>(
    items.find((item) => item.id === initialId) ?? null,
  )
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const values = Object.fromEntries(new FormData(event.currentTarget))
    const payload = {
      ...values,
      latitude: values.latitude ? Number(values.latitude) : null,
      longitude: values.longitude ? Number(values.longitude) : null,
      active: values.active === 'on',
      isPrimary: values.isPrimary === 'on',
      ...(editing ? { version: editing.version } : {}),
    }
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch('/api/admin/showrooms' + (editing ? '/' + encodeURIComponent(editing.id) : ''), {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await response.json()
      setError(!response.ok)
      setMessage(body.message ?? body.error?.message ?? (response.ok ? 'Saved.' : 'Unable to save showroom.'))
      if (response.ok) {
        setEditing(null)
        router.refresh()
      }
    } catch {
      setError(true)
      setMessage('Network error. The showroom has not been saved.')
    } finally {
      setBusy(false)
    }
  }

  const field = (key: keyof BranchItem) => editing?.[key] == null ? '' : String(editing[key])

  return (
    <div className="admin-detail-layout">
      <div className="admin-detail-stack">
        {items.length === 0 ? (
          <section className="admin-panel admin-panel--full"><div className="admin-panel__body">
            <p>No showrooms yet. Create your first fictional branch using the form.</p>
          </div></section>
        ) : items.map((item) => (
          <section className="admin-panel admin-panel--full" key={item.id}>
            <header><h2>{item.name}</h2>
              <AdminStatus value={item.isPrimary ? 'Primary' : item.active ? 'Active' : 'Inactive'} />
            </header>
            <div className="admin-panel__body">
              <p>{item.address}, {item.city}, {item.state} {item.postalCode}</p>
              <p>{item.phone} — {item.email}</p>
              <p style={{ color: 'var(--admin-muted)', fontSize: 12 }}>
                <Users size={14} aria-hidden="true" style={{ verticalAlign: 'middle' }} />{' '}
                {item._count?.staffAssignments ?? 0} assigned staff • Revision {item.version}
              </p>
              <div className="admin-page-actions">
                <button className="admin-button admin-button--secondary" type="button" onClick={() => {
                  setEditing(item); setMessage(''); setError(false)
                }}>Edit showroom</button>
                <Link className="admin-button admin-button--secondary"
                  href={'/admin/showrooms/' + encodeURIComponent(item.id) + '/staff'}>
                  Manage staff
                </Link>
              </div>
            </div>
          </section>
        ))}
      </div>
      <aside className="admin-panel">
        <header><h2>{editing ? 'Edit showroom' : 'Add showroom'}</h2></header>
        <div className="admin-panel__body">
          <form className="admin-form" key={editing?.id ?? 'new'} onSubmit={submit}>
            {(['name', 'address', 'city', 'state', 'postalCode', 'country', 'phone', 'email',
              'whatsapp', 'hours', 'mapUrl', 'latitude', 'longitude'] as const).map((key) => (
              <label key={key}>
                {key.replace(/([A-Z])/g, ' $1')}
                <input
                  name={key}
                  required={['name', 'address', 'city', 'state', 'postalCode',
                    'country', 'phone', 'email', 'hours'].includes(key)}
                  type={key === 'email' ? 'email' : key === 'latitude' || key === 'longitude' ? 'number' : 'text'}
                  step={key === 'latitude' || key === 'longitude' ? 'any' : undefined}
                  defaultValue={field(key)}
                  disabled={busy}
                />
              </label>
            ))}
            <label className="admin-checkbox">
              <input name="active" type="checkbox" defaultChecked={editing?.active ?? true} disabled={busy} />
              <span>Active branch</span>
            </label>
            <label className="admin-checkbox">
              <input name="isPrimary" type="checkbox" defaultChecked={editing?.isPrimary ?? false} disabled={busy} />
              <span>Primary showroom</span>
            </label>
            <small style={{ color: 'var(--admin-muted)' }}>
              Making another active showroom primary transfers primary status. Remove staff before deactivating a branch.
            </small>
            {message ? <p className={'admin-form-message' + (error ? ' is-error' : '')} role="status">{message}</p> : null}
            <div className="admin-page-actions">
              {editing ? <button type="button" className="admin-button admin-button--secondary"
                disabled={busy} onClick={() => { setEditing(null); setMessage(''); setError(false) }}>
                Cancel edit
              </button> : null}
              <button className="admin-button" type="submit" disabled={busy}>
                {busy ? <LoaderCircle aria-hidden="true" /> : <Save aria-hidden="true" />}
                {busy ? 'Saving…' : editing ? 'Save showroom' : 'Create showroom'}
              </button>
            </div>
          </form>
        </div>
      </aside>
    </div>
  )
}
