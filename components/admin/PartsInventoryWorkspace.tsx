'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

type Part = { id: string; sku: string; name: string; unit: string }
type Stock = { partId: string; showroomId: string; quantity: string }
type Showroom = { id: string; name: string }
type Request = { id: string; quantity: string; version: number; part: { sku: string; name: string; unit: string }; workshopOrder: { referenceNumber: string; showroom: { name: string } | null; vehicle: { shortTitle: string; stockNumber: string } }; requestedBy: { name: string | null } | null }

export function PartsInventoryWorkspace({ parts, stocks, showrooms, requests, canUpdate }: { parts: Part[]; stocks: Stock[]; showrooms: Showroom[]; requests: Request[]; canUpdate: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const form = new FormData(event.currentTarget)
    const payload = Object.fromEntries(form.entries())
    const formElement = event.currentTarget
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/admin/parts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.error?.code ?? 'Unable to record the part receipt.')
      formElement.reset(); router.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to record the part receipt.') }
    finally { setBusy(false) }
  }

  async function issue(request: Request) {
    if (busy) return
    setBusy(true); setError('')
    try {
      const response = await fetch(`/api/admin/parts/requests/${encodeURIComponent(request.id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ version: request.version }) })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.error?.code ?? 'Unable to issue this request.')
      router.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to issue this request.') }
    finally { setBusy(false) }
  }

  async function restock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const form = event.currentTarget
    const payload = Object.fromEntries(new FormData(form).entries())
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/admin/parts/stock', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.error?.code ?? 'Unable to receive this stock.')
      form.reset(); router.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to receive this stock.') }
    finally { setBusy(false) }
  }

  return <>
    {error ? <p role="alert" className="admin-form-message is-error">{error}</p> : null}
    {canUpdate && showrooms.length ? <section className="admin-panel admin-panel--full"><header><h2>Receive stock</h2></header><div className="admin-panel__body">
      <form className="admin-form" onSubmit={submit}>
        <label>SKU<input name="sku" required minLength={2} maxLength={40} /></label>
        <label>Part name<input name="name" required minLength={2} maxLength={120} /></label>
        <label>Unit<input name="unit" defaultValue="each" required maxLength={20} /></label>
        <label>Showroom<select name="showroomId" required>{showrooms.map((showroom) => <option key={showroom.id} value={showroom.id}>{showroom.name}</option>)}</select></label>
        <label>Quantity<input name="quantity" type="number" min="0.01" step="0.01" required /></label>
        <label>Receipt note<input name="reason" required minLength={2} maxLength={240} /></label>
        <button className="admin-button" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Create part and receive stock'}</button>
      </form>
      <p>Stock changes are recorded as an audited ledger. Workshop requests reduce stock only when a parts manager issues them.</p>
      {parts.length ? <form className="admin-form" onSubmit={restock}>
        <label>Existing part<select name="partId" required>{parts.map((part) => <option key={part.id} value={part.id}>{part.sku} · {part.name}</option>)}</select></label>
        <label>Showroom<select name="showroomId" required>{showrooms.map((showroom) => <option key={showroom.id} value={showroom.id}>{showroom.name}</option>)}</select></label>
        <label>Quantity<input name="quantity" type="number" min="0.01" step="0.01" required /></label>
        <label>Receipt note<input name="reason" required minLength={2} maxLength={240} /></label>
        <label>Reference<input name="reference" maxLength={100} /></label>
        <button className="admin-button admin-button--secondary" disabled={busy}>Receive existing part</button>
      </form> : null}
    </div></section> : null}
    <section className="admin-panel admin-panel--full"><header><h2>Branch inventory</h2></header><div className="admin-panel__body">
      {parts.length && stocks.length ? <div className="admin-table-wrap"><table className="admin-table"><caption>Quantity on hand by branch</caption><thead><tr><th>SKU</th><th>Part</th><th>Showroom</th><th>On hand</th></tr></thead><tbody>{stocks.map((stock) => { const part = parts.find((entry) => entry.id === stock.partId); const showroom = showrooms.find((entry) => entry.id === stock.showroomId); return <tr key={`${stock.partId}-${stock.showroomId}`}><td>{part?.sku}</td><td>{part?.name} <small>{part?.unit}</small></td><td>{showroom?.name ?? 'Branch'}</td><td>{stock.quantity}</td></tr> })}</tbody></table></div> : <p>No parts stock is recorded in your showroom scope.</p>}
    </div></section>
    <section className="admin-panel admin-panel--full"><header><h2>Workshop issue requests</h2></header><div className="admin-panel__body">
      {requests.length ? <div className="admin-table-wrap"><table className="admin-table"><caption>Open parts requests for your assigned branches</caption><thead><tr><th>Workshop job</th><th>Part</th><th>Quantity</th><th>Action</th></tr></thead><tbody>{requests.map((request) => <tr key={request.id}><td><strong>{request.workshopOrder.referenceNumber}</strong><small><br />{request.workshopOrder.vehicle.stockNumber} · {request.workshopOrder.vehicle.shortTitle}<br />{request.workshopOrder.showroom?.name}</small></td><td>{request.part.sku} · {request.part.name}</td><td>{request.quantity} {request.part.unit}</td><td>{canUpdate ? <button className="admin-button" disabled={busy} onClick={() => void issue(request)}>Issue stock</button> : 'Awaiting parts manager'}</td></tr>)}</tbody></table></div> : <p>No open workshop issue requests in your showroom scope.</p>}
    </div></section>
  </>
}
