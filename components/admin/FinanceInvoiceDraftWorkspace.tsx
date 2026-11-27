'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type DealOption = { id: string; referenceNumber: string; vehicle: { shortTitle: string; stockNumber: string }; quoteDraft: { estimatedSubtotal: number; currency: string } }
type InvoiceDraft = { id: string; referenceNumber: string; status: string; vehicleTitle: string; stockNumber: string; vehiclePrice: number; discountAmount: number; estimatedOtherFees: number; estimatedSubtotal: number; currency: string; deal: { referenceNumber: string; inquiry: { referenceNumber: string } }; paymentSimulations: Array<{ simulatorReference: string; amount: number; currency: string; outcome: string; createdAt: Date }>; createdAt: Date }

export function FinanceInvoiceDraftWorkspace({ eligibleDeals, drafts, sandboxEnabled }: { eligibleDeals: DealOption[]; drafts: InvoiceDraft[]; sandboxEnabled: boolean }) {
  const router = useRouter()
  const [busyId, setBusyId] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState(false)

  async function createDraft(dealId: string) {
    if (busyId) return
    setBusyId(dealId); setMessage(''); setError(false)
    try {
      const response = await fetch('/api/admin/finance/invoice-drafts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dealId }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.error?.message ?? 'Unable to create the finance worksheet.')
      setMessage(result.message); router.refresh()
    } catch (cause) {
      setError(true); setMessage(cause instanceof Error ? cause.message : 'Unable to create the finance worksheet.')
    } finally { setBusyId('') }
  }

  async function simulatePayment(invoiceDraftId: string, outcome: 'APPROVED' | 'DECLINED') {
    if (!sandboxEnabled || busyId) return
    setBusyId(invoiceDraftId); setMessage(''); setError(false)
    try {
      const response = await fetch('/api/admin/finance/payment-simulations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceDraftId, idempotencyKey: crypto.randomUUID(), outcome }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.error?.message ?? 'Unable to run the payment sandbox simulation.')
      setMessage(result.message); router.refresh()
    } catch (cause) {
      setError(true); setMessage(cause instanceof Error ? cause.message : 'Unable to run the payment sandbox simulation.')
    } finally { setBusyId('') }
  }

  return <>
    <section className="admin-panel admin-panel--full">
      <header><h2>Won deals ready for finance review</h2></header>
      <div className="admin-panel__body">
        <p>Create one internal worksheet per won deal. Amounts are copied from its indicative quote and remain estimates; tax treatment, buyer identity, legal invoice issuance and payments are not covered here.</p>
        {eligibleDeals.length ? <div className="admin-table-wrap"><table className="admin-table">
          <caption>Deals eligible for a finance worksheet</caption>
          <thead><tr><th>Deal</th><th>Vehicle</th><th>Indicative amount</th><th>Action</th></tr></thead>
          <tbody>{eligibleDeals.map((deal) => <tr key={deal.id}>
            <td><strong>{deal.referenceNumber}</strong></td>
            <td>{deal.vehicle.shortTitle}<small> · {deal.vehicle.stockNumber}</small></td>
            <td>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: deal.quoteDraft.currency, maximumFractionDigits: 0 }).format(deal.quoteDraft.estimatedSubtotal)}</td>
            <td><button className="admin-button" type="button" disabled={Boolean(busyId)} onClick={() => createDraft(deal.id)}>{busyId === deal.id ? 'Creating…' : 'Create draft worksheet'}</button></td>
          </tr>)}</tbody>
        </table></div> : <p>No won deals are waiting for finance review.</p>}
        {message ? <p role={error ? 'alert' : 'status'} className={error ? 'admin-form-message is-error' : 'admin-form-message'}>{message}</p> : null}
        <p>{sandboxEnabled ? 'Payment sandbox mode is enabled for this protected preview.' : 'Payment sandbox simulations are disabled in this environment.'} Real payment capture is not available.</p>
      </div>
    </section>
    <section className="admin-panel admin-panel--full">
      <header><h2>Internal finance worksheets</h2></header>
      <div className="admin-panel__body">
        {drafts.length ? <div className="admin-table-wrap"><table className="admin-table">
          <caption>Non-final finance worksheets</caption>
          <thead><tr><th>Reference</th><th>Deal / Enquiry</th><th>Vehicle</th><th>Indicative total</th><th>Sandbox simulation</th><th>Created</th></tr></thead>
          <tbody>{drafts.map((draft) => <tr key={draft.id}>
            <td><strong>{draft.referenceNumber}</strong><small><br />{draft.status} · internal draft</small></td>
            <td>{draft.deal.referenceNumber}<small> · {draft.deal.inquiry.referenceNumber}</small></td>
            <td>{draft.vehicleTitle}<small> · {draft.stockNumber}</small></td>
            <td>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: draft.currency, maximumFractionDigits: 0 }).format(draft.estimatedSubtotal)}</td>
            <td>{sandboxEnabled ? <><button className="admin-button admin-button--secondary" type="button" disabled={Boolean(busyId)} onClick={() => simulatePayment(draft.id, 'APPROVED')}>{busyId === draft.id ? 'Simulating…' : 'Simulate approval'}</button>{' '}<button className="admin-button admin-button--secondary" type="button" disabled={Boolean(busyId)} onClick={() => simulatePayment(draft.id, 'DECLINED')}>Simulate decline</button></> : 'Disabled'}
              {draft.paymentSimulations.length ? <ul>{draft.paymentSimulations.map((attempt) => <li key={attempt.simulatorReference}>{attempt.outcome} (simulated) · {attempt.simulatorReference}</li>)}</ul> : null}</td>
            <td><time dateTime={new Date(draft.createdAt).toISOString()}>{new Date(draft.createdAt).toLocaleDateString('en-IN')}</time></td>
          </tr>)}</tbody>
        </table></div> : <p>No finance worksheets have been created.</p>}
      </div>
    </section>
  </>
}
