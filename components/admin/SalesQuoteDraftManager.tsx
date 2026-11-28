'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

type Draft = {
  id: string; vehiclePrice: number; discountAmount: number; estimatedOtherFees: number;
  estimatedSubtotal: number; currency: string; note: string | null; createdAt: string;
  createdBy: { name: string | null };
}
type Props = { inquiryId: string; currentPrice: number; canCreate: boolean; drafts: Draft[] }

export function SalesQuoteDraftManager({ inquiryId, currentPrice, canCreate, drafts }: Props) {
  const router = useRouter()
  const [discount, setDiscount] = useState('0')
  const [fees, setFees] = useState('0')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState(false)
  const money = (value: number) => new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(value)
  const discountAmount = Number(discount)
  const estimatedOtherFees = Number(fees)
  const valid = Number.isSafeInteger(discountAmount) && Number.isSafeInteger(estimatedOtherFees) &&
    discountAmount >= 0 && discountAmount <= currentPrice && estimatedOtherFees >= 0 &&
    estimatedOtherFees <= 100000000
  const total = currentPrice - discountAmount + estimatedOtherFees

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || !canCreate || !valid) return
    setBusy(true); setMessage(''); setError(false)
    try {
      const response = await fetch(`/api/admin/enquiries/${encodeURIComponent(inquiryId)}/quotes`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discountAmount, estimatedOtherFees, note: note.trim() }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.error?.message ?? 'Unable to save quote worksheet.')
      setMessage('Indicative worksheet saved internally. Nothing was sent to the customer.')
      setDiscount('0'); setFees('0'); setNote('')
      router.refresh()
    } catch (cause) {
      setError(true); setMessage(cause instanceof Error ? cause.message : 'Worksheet save failed.')
    } finally { setBusy(false) }
  }

  return <div className="admin-detail-stack">
    <section className="admin-panel admin-panel--full">
      <header><h2>Indicative price worksheet</h2></header>
      <div className="admin-panel__body">
        <p>Vehicle list price: <strong>{money(currentPrice)}</strong>. Estimates do not include
          taxes, statutory transfer charges, insurance, loan/finance fees or final approvals.</p>
        {canCreate ? <form className="admin-form" onSubmit={save}>
          <label>Proposed discount (₹)
            <input type="number" min={0} max={currentPrice} step={1} value={discount}
              disabled={busy} onChange={(e) => setDiscount(e.target.value)} required />
          </label>
          <label>Other estimated fees, before tax (₹)
            <input type="number" min={0} max={100000000} step={1} value={fees}
              disabled={busy} onChange={(e) => setFees(e.target.value)} required />
          </label>
          <label>Private internal note (optional)
            <textarea rows={2} maxLength={500} value={note} disabled={busy}
              onChange={(e) => setNote(e.target.value)} />
          </label>
          <p>Indicative subtotal, excluding taxes: <strong>{valid ? money(total) : 'Invalid amounts'}</strong></p>
          <button type="submit" className="admin-button" disabled={busy || !valid}>
            {busy ? 'Saving…' : 'Save internal draft'}
          </button>
        </form> : <p>Draft creation requires a permitted open enquiry and a published, available INR-priced vehicle.</p>}
        {message ? <p role={error ? 'alert' : 'status'}
          className={error ? 'admin-form-message is-error' : 'admin-form-message'}>{message}</p> : null}
        <p><small>Saved drafts are internal calculations only and do not reserve a vehicle, create an invoice or accept payment.</small></p>
      </div>
    </section>
    <section className="admin-panel admin-panel--full">
      <header><h2>Saved quote worksheets</h2></header>
      <div className="admin-panel__body">
        {drafts.length ? <ul>{drafts.map((item) => <li key={item.id}>
          <strong>{money(item.estimatedSubtotal)} indicative subtotal</strong>
          <p>List {money(item.vehiclePrice)} − discount {money(item.discountAmount)} + estimated fees {money(item.estimatedOtherFees)}</p>
          <p>Prepared {new Date(item.createdAt).toLocaleString('en-IN')} by {item.createdBy.name ?? 'Authorized staff'}</p>
          {item.note ? <p>Internal note: {item.note}</p> : null}
        </li>)}</ul> : <p>No internal quote worksheets recorded for this enquiry.</p>}
      </div>
    </section>
  </div>
}
