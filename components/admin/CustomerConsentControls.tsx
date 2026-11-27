'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Channel = 'marketingEmails' | 'whatsAppUpdates'
type Consent = { channel: Channel; consented: boolean; everConsentedAt: string | null }
const titles: Record<Channel, string> = {
  marketingEmails: 'Marketing emails',
  whatsAppUpdates: 'WhatsApp promotional updates',
}

export function CustomerConsentControls({
  customerId, initial, canWithdraw,
}: { customerId: string; initial: Consent[]; canWithdraw: boolean }) {
  const router = useRouter()
  const [items, setItems] = useState(initial)
  const [busy, setBusy] = useState<Channel | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState(false)

  async function withdraw(channel: Channel) {
    if (busy || !canWithdraw) return
    setBusy(channel); setError(false); setMessage('')
    try {
      const response = await fetch(
        `/api/admin/customers/${encodeURIComponent(customerId)}/privacy/withdraw`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channel }) },
      )
      const body = await response.json().catch(() => null)
      if (!response.ok) throw new Error(body?.error?.message ?? 'Could not save preference.')
      setItems((current) => current.map((item) => item.channel === channel ?
        { ...item, consented: false } : item))
      setMessage(body?.message ?? 'Marketing consent withdrawn.')
      router.refresh()
    } catch (cause) {
      setError(true)
      setMessage(cause instanceof Error ? cause.message : 'Privacy preferences could not be updated.')
    } finally { setBusy(null) }
  }

  return <section className="admin-panel admin-panel--full">
    <header><h2>Privacy & promotional communication</h2></header>
    <div className="admin-panel__body">
      <p>Staff can withdraw existing promotional consent, but cannot consent on a customer’s behalf.
        Ordinary enquiry and account-service updates are separate from promotional communication.</p>
      {items.map((item) => <div key={item.channel}
        style={{ paddingBlock: 12, borderBottom: '1px solid var(--admin-border)' }}>
        <strong>{titles[item.channel]}</strong>
        <p>Current status: {item.consented ? 'Consented' : 'Not consented / suppressed'}</p>
        <p>Historical opt-in date: {item.everConsentedAt ?
          new Date(item.everConsentedAt).toLocaleString('en-IN') : 'No verified opt-in recorded'}</p>
        {canWithdraw && item.consented ? <button type="button"
          className="admin-button admin-button--secondary" disabled={Boolean(busy)}
          onClick={() => withdraw(item.channel)}>
          {busy === item.channel ? 'Disabling…' : 'Withdraw consent'}
        </button> : null}
      </div>)}
      {message ? <p role={error ? 'alert' : 'status'} aria-live="polite"
        className={error ? 'admin-form-message is-error' : 'admin-form-message'}>{message}</p> : null}
      <p><small>Consent withdrawal is recorded in the restricted audit trail. Historical evidence
        of an earlier opt-in remains available for authorized review.</small></p>
    </div>
  </section>
}
