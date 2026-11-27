'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type ChecklistItem = { id: string; code: string; completedAt: Date | null; completedById: string | null; version: number }
type DeliveryCase = { id: string; referenceNumber: string; status: string; version: number; vehicle: { shortTitle: string; stockNumber: string; status: string }; deal: { referenceNumber: string }; showroom: { name: string } | null; items: ChecklistItem[] }
type DealOption = { id: string; referenceNumber: string; vehicle: { shortTitle: string; stockNumber: string; status: string } }

const labels: Record<string, string> = {
  CLEARED_PAYMENT_VERIFIED: 'Cleared funds verified offline by Finance',
  CUSTOMER_DOCUMENTS_CHECKED: 'Customer documents checked',
  VEHICLE_PREPARATION_COMPLETE: 'Vehicle preparation complete',
  INSURANCE_DOCUMENTS_READY: 'Insurance documents ready',
  RC_TRANSFER_DOCUMENTS_READY: 'RC transfer documents ready',
}

export function DeliveryCaseWorkspace({ cases, eligibleDeals, canUpdate, canVerifySettlement }: {
  cases: DeliveryCase[]; eligibleDeals: DealOption[]; canUpdate: boolean; canVerifySettlement: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [acknowledged, setAcknowledged] = useState<Record<string, boolean>>({})

  async function request(key: string, url: string, body: object, method = 'PATCH') {
    if (busy) return
    setBusy(key); setError('')
    try {
      const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.error?.message ?? result?.error?.code ?? 'Unable to update delivery preparation.')
      router.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to update delivery preparation.') }
    finally { setBusy('') }
  }

  return <>
    <section className="admin-panel admin-panel--full">
      <header><h2>Eligible won deals</h2></header>
      <div className="admin-panel__body">
        <p>Opening a case reserves the vehicle. Finance must verify cleared funds outside this application. The checklist does not submit RC transfer documents or send customer messages.</p>
        {eligibleDeals.length ? <div className="admin-table-wrap"><table className="admin-table">
          <caption>Won deals with a finance worksheet and an available vehicle</caption>
          <thead><tr><th>Deal</th><th>Vehicle</th><th>Action</th></tr></thead>
          <tbody>{eligibleDeals.map((deal) => <tr key={deal.id}>
            <td>{deal.referenceNumber}</td><td>{deal.vehicle.shortTitle}<small> · {deal.vehicle.stockNumber}</small></td>
            <td>{canUpdate ? <button className="admin-button" disabled={Boolean(busy)} onClick={() => request(deal.id, '/api/admin/delivery-cases', { dealId: deal.id }, 'POST')}>{busy === deal.id ? 'Opening…' : 'Open delivery preparation'}</button> : 'Operations access required'}</td>
          </tr>)}</tbody>
        </table></div> : <p>No available won deals are ready for delivery preparation.</p>}
      </div>
    </section>
    <section className="admin-panel admin-panel--full">
      <header><h2>Delivery and transfer preparation</h2></header>
      <div className="admin-panel__body">
        {error ? <p role="alert" className="admin-form-message is-error">{error}</p> : null}
        {cases.length ? <div className="admin-table-wrap"><table className="admin-table">
          <caption>Showroom-scoped delivery cases</caption>
          <thead><tr><th>Case</th><th>Deal / Vehicle</th><th>Checklist</th><th>Status / action</th></tr></thead>
          <tbody>{cases.map((item) => <tr key={item.id}>
            <td><strong>{item.referenceNumber}</strong><small><br />{item.showroom?.name ?? 'Unassigned showroom'}</small></td>
            <td>{item.deal.referenceNumber}<small><br />{item.vehicle.shortTitle} · {item.vehicle.stockNumber} · {item.vehicle.status}</small></td>
            <td><ul className="admin-checklist">{item.items.map((check) => {
              const canEdit = check.code === 'CLEARED_PAYMENT_VERIFIED' ? canVerifySettlement : canUpdate
              const label = check.code === 'CLEARED_PAYMENT_VERIFIED'
                ? `${labels[check.code]} (no payment is processed here)` : labels[check.code]
              return <li key={check.id}><label><input type="checkbox" checked={Boolean(check.completedAt)} disabled={!canEdit || item.status !== 'PREPARING' || Boolean(busy)} onChange={(event) => request(check.id, `/api/admin/delivery-cases/${encodeURIComponent(item.id)}/checklist/${encodeURIComponent(check.code)}`, { completed: event.target.checked, version: check.version })} /> {label}</label></li>
            })}</ul></td>
            <td><strong>{item.status.replaceAll('_', ' ')}</strong><div className="admin-actions">
              {canUpdate && item.status === 'PREPARING' ? <>
                <button className="admin-button admin-button--secondary" disabled={Boolean(busy)} onClick={() => request(`${item.id}-ready`, `/api/admin/delivery-cases/${encodeURIComponent(item.id)}`, { version: item.version, status: 'READY_FOR_HANDOVER' })}>Ready for handover</button>
                <button className="admin-button admin-button--secondary" disabled={Boolean(busy)} onClick={() => request(`${item.id}-cancel`, `/api/admin/delivery-cases/${encodeURIComponent(item.id)}`, { version: item.version, status: 'CANCELLED' })}>Cancel and release vehicle</button>
              </> : null}
              {canUpdate && item.status === 'READY_FOR_HANDOVER' ? <>
                <label><input type="checkbox" checked={Boolean(acknowledged[item.id])} onChange={(event) => setAcknowledged({ ...acknowledged, [item.id]: event.target.checked })} /> Customer handover acknowledgement recorded</label>
                <button className="admin-button" disabled={Boolean(busy) || !acknowledged[item.id]} onClick={() => request(`${item.id}-handover`, `/api/admin/delivery-cases/${encodeURIComponent(item.id)}`, { version: item.version, status: 'HANDED_OVER', customerAcknowledged: true })}>Record handover</button>
              </> : null}
            </div></td>
          </tr>)}</tbody>
        </table></div> : <p>No delivery cases have been opened.</p>}
      </div>
    </section>
  </>
}
