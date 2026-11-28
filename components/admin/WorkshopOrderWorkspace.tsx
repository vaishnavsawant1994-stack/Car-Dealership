'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type VehicleOption = { id: string; shortTitle: string; stockNumber: string; year: number; showroom: { name: string } | null }
type ChecklistItem = { id: string; code: string; completedAt: Date | null; completedById: string | null; version: number }
type WorkshopOrder = { id: string; referenceNumber: string; jobType: string; status: string; version: number; createdAt: Date; vehicle: { shortTitle: string; stockNumber: string; year: number }; showroom: { name: string } | null; assignedTo: { id: string; name: string | null } | null; checklist: ChecklistItem[] }

const labels: Record<string, string> = {
  INTAKE_INSPECTION_COMPLETE: 'Intake inspection complete',
  DIAGNOSIS_RECORDED: 'Diagnosis recorded',
  SERVICE_WORK_COMPLETE: 'Service work complete',
  SAFETY_REVIEW_COMPLETE: 'Safety review complete',
}

export function WorkshopOrderWorkspace({ orders, eligibleVehicles, canUpdate }: { orders: WorkshopOrder[]; eligibleVehicles: VehicleOption[]; canUpdate: boolean }) {
  const router = useRouter()
  const [vehicleId, setVehicleId] = useState(eligibleVehicles[0]?.id ?? '')
  const [jobType, setJobType] = useState('SERVICE')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  async function send(key: string, url: string, body: object, method = 'PATCH') {
    if (busy) return
    setBusy(key); setError('')
    try {
      const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.error?.message ?? result?.error?.code ?? 'Unable to update the workshop order.')
      router.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to update the workshop order.') }
    finally { setBusy('') }
  }

  return <>
    <section className="admin-panel admin-panel--full">
      <header><h2>Sold vehicles available for service</h2></header>
      <div className="admin-panel__body">
        <p>Job cards are internal workshop records. Customer contact, parts inventory, labor billing and messages remain separate workflows.</p>
        {canUpdate && eligibleVehicles.length ? <form className="admin-form" onSubmit={(event) => { event.preventDefault(); if (vehicleId) void send('create', '/api/admin/workshop/orders', { vehicleId, jobType }, 'POST') }}>
          <label>Vehicle<select value={vehicleId} onChange={(event) => setVehicleId(event.target.value)} disabled={Boolean(busy)}>{eligibleVehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.stockNumber} · {vehicle.year} {vehicle.shortTitle}</option>)}</select></label>
          <label>Job type<select value={jobType} onChange={(event) => setJobType(event.target.value)} disabled={Boolean(busy)}><option value="SERVICE">Scheduled service</option><option value="REPAIR">Repair</option><option value="DIAGNOSTIC">Diagnostic</option></select></label>
          <button className="admin-button" type="submit" disabled={Boolean(busy) || !vehicleId}>{busy === 'create' ? 'Opening…' : 'Open job card'}</button>
        </form> : <p>{eligibleVehicles.length ? 'Workshop update access is required to open a job card.' : 'No sold vehicles are available for a new active job card.'}</p>}
      </div>
    </section>
    <section className="admin-panel admin-panel--full">
      <header><h2>Workshop job cards</h2></header>
      <div className="admin-panel__body">
        {error ? <p role="alert" className="admin-form-message is-error">{error}</p> : null}
        {orders.length ? <div className="admin-table-wrap"><table className="admin-table">
          <caption>Branch and assignment-scoped workshop orders</caption>
          <thead><tr><th>Job card</th><th>Vehicle</th><th>Checklist</th><th>Status / action</th></tr></thead>
          <tbody>{orders.map((order) => <tr key={order.id}>
            <td><strong>{order.referenceNumber}</strong><small><br />{order.jobType} · {order.showroom?.name ?? 'Unassigned showroom'}<br />Assigned to {order.assignedTo?.name ?? 'staff'}</small></td>
            <td>{order.vehicle.year} {order.vehicle.shortTitle}<small> · {order.vehicle.stockNumber}</small></td>
            <td><ul className="admin-checklist">{order.checklist.map((check) => <li key={check.id}><label><input type="checkbox" checked={Boolean(check.completedAt)} disabled={!canUpdate || ['COMPLETED', 'CANCELLED'].includes(order.status) || Boolean(busy)} onChange={(event) => send(check.id, `/api/admin/workshop/orders/${encodeURIComponent(order.id)}/checklist/${encodeURIComponent(check.code)}`, { completed: event.target.checked, version: check.version })} /> {labels[check.code]}</label></li>)}</ul></td>
            <td><strong>{order.status.replaceAll('_', ' ')}</strong>{canUpdate ? <div className="admin-actions">
              {order.status === 'OPEN' ? <><button className="admin-button admin-button--secondary" disabled={Boolean(busy)} onClick={() => send(`${order.id}-schedule`, `/api/admin/workshop/orders/${encodeURIComponent(order.id)}`, { status: 'SCHEDULED', version: order.version })}>Schedule</button><button className="admin-button admin-button--secondary" disabled={Boolean(busy)} onClick={() => send(`${order.id}-cancel`, `/api/admin/workshop/orders/${encodeURIComponent(order.id)}`, { status: 'CANCELLED', version: order.version })}>Cancel</button></> : null}
              {order.status === 'SCHEDULED' ? <><button className="admin-button admin-button--secondary" disabled={Boolean(busy)} onClick={() => send(`${order.id}-start`, `/api/admin/workshop/orders/${encodeURIComponent(order.id)}`, { status: 'IN_PROGRESS', version: order.version })}>Start work</button><button className="admin-button admin-button--secondary" disabled={Boolean(busy)} onClick={() => send(`${order.id}-cancel`, `/api/admin/workshop/orders/${encodeURIComponent(order.id)}`, { status: 'CANCELLED', version: order.version })}>Cancel</button></> : null}
              {order.status === 'IN_PROGRESS' ? <button className="admin-button" disabled={Boolean(busy)} onClick={() => send(`${order.id}-complete`, `/api/admin/workshop/orders/${encodeURIComponent(order.id)}`, { status: 'COMPLETED', version: order.version })}>Complete service work</button> : null}
            </div> : null}</td>
          </tr>)}</tbody>
        </table></div> : <p>No workshop job cards are open in your scope.</p>}
      </div>
    </section>
  </>
}
