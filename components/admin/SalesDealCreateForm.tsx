'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

type QuoteOption = { id: string; estimatedSubtotal: number; currency: string; createdAt: string }
type ExistingDeal = { id: string; referenceNumber: string; status: string }

export function SalesDealCreateForm({ inquiryId, quotes, canCreate, existingDeal }: {
  inquiryId: string; quotes: QuoteOption[]; canCreate: boolean; existingDeal: ExistingDeal | null
}) {
  const router = useRouter()
  const [quoteDraftId, setQuoteDraftId] = useState(quotes[0]?.id ?? '')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState(false)

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canCreate || !quoteDraftId || busy) return
    setBusy(true); setMessage(''); setError(false)
    try {
      const response = await fetch(`/api/admin/enquiries/${encodeURIComponent(inquiryId)}/deals`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteDraftId }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.error?.message ?? 'Unable to open the sales deal.')
      setMessage(`${result.data.referenceNumber} opened. No customer message, vehicle reservation, invoice, or payment was created.`)
      router.refresh()
    } catch (cause) {
      setError(true); setMessage(cause instanceof Error ? cause.message : 'Unable to open the sales deal.')
    } finally { setBusy(false) }
  }

  return <section className="admin-panel admin-panel--full">
    <header><h2>Deal lifecycle</h2></header>
    <div className="admin-panel__body">
      <p>Start an internal deal from a current quote worksheet. A deal tracks staff progress and acceptance evidence; finance, payment, vehicle reservation, and delivery remain separate workflows.</p>
      {existingDeal ? <p>Existing deal: <strong>{existingDeal.referenceNumber}</strong> ({existingDeal.status}). <Link href="/admin/deals">Open deal workspace</Link></p>
        : quotes.length && canCreate ? <form className="admin-form" onSubmit={create}>
          <label>Quote worksheet
            <select value={quoteDraftId} onChange={(event) => setQuoteDraftId(event.target.value)} disabled={busy}>
              {quotes.map((quote) => <option key={quote.id} value={quote.id}>
                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(quote.estimatedSubtotal)} · {new Date(quote.createdAt).toLocaleDateString('en-IN')}
              </option>)}
            </select>
          </label>
          <button className="admin-button" type="submit" disabled={busy || !quoteDraftId}>
            {busy ? 'Opening…' : 'Open internal deal'}
          </button>
        </form> : <p>Create a current quote worksheet for an open enquiry before starting a deal.</p>}
      {message ? <p role={error ? 'alert' : 'status'} className={error ? 'admin-form-message is-error' : 'admin-form-message'}>{message}</p> : null}
    </div>
  </section>
}
