'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Kind = 'ACCESS' | 'RECTIFICATION' | 'ERASURE'
type Item = { id: string; kind: Kind; status: string; createdAt: string; createdBy: { name: string | null } }
const kinds: Array<{ value: Kind; label: string }> = [
  { value: 'ACCESS', label: 'Customer data access request' },
  { value: 'RECTIFICATION', label: 'Customer data correction request' },
  { value: 'ERASURE', label: 'Customer data erasure request' },
]

export function CustomerDataRightsIntake({ customerId, initial }: { customerId: string; initial: Item[] }) {
  const router = useRouter()
  const [kind, setKind] = useState<Kind>('ACCESS')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const [message, setMessage] = useState('')

  async function submit() {
    if (busy) return
    setBusy(true); setError(false); setMessage('')
    try {
      const response = await fetch(
        `/api/admin/customers/${encodeURIComponent(customerId)}/privacy/requests`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind }) },
      )
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.error?.message ?? 'Unable to log request.')
      setMessage('Request logged for manual identity verification. No data was exported or deleted.')
      router.refresh()
    } catch (cause) {
      setError(true); setMessage(cause instanceof Error ? cause.message : 'Request could not be logged.')
    } finally { setBusy(false) }
  }

  return <section className="admin-panel admin-panel--full">
    <header><h2>Customer data-rights requests</h2></header>
    <div className="admin-panel__body">
      <p>Record a request for review. This does not establish the requester's identity, grant data access,
        or permanently delete any account or record.</p>
      <label>Request type
        <select value={kind} disabled={busy} onChange={(e) => setKind(e.target.value as Kind)}>
          {kinds.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </label>
      <button type="button" className="admin-button" disabled={busy} onClick={submit}>
        {busy ? 'Logging request…' : 'Log request for manual verification'}
      </button>
      {message ? <p role={error ? 'alert' : 'status'} aria-live="polite"
        className={error ? 'admin-form-message is-error' : 'admin-form-message'}>{message}</p> : null}
      <h3>Recent requests</h3>
      {initial.length ? <ul>
        {initial.map((item) => <li key={item.id}>
          <strong>{kinds.find((option) => option.value === item.kind)?.label ?? item.kind}</strong>
          <p>{item.status.replaceAll('_', ' ')} · Logged {new Date(item.createdAt).toLocaleString('en-IN')}
            {' '}by {item.createdBy.name ?? 'Authorized staff'}</p>
        </li>)}
      </ul> : <p>No data-rights requests recorded.</p>}
      <p><small>Requests must be verified and resolved under a separate approved privacy process.</small></p>
    </div>
  </section>
}
