'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

type Delivery = { id: string; referenceNumber: string; showroom: { name: string } | null; vehicle: { shortTitle: string; stockNumber: string; year: number } }
type Task = { id: string; type: string; status: string; dueAt: Date; completedAt: Date | null; version: number; deliveryCase: { id: string; referenceNumber: string; vehicle: { shortTitle: string; stockNumber: string; year: number } }; showroom: { id: string; name: string }; assignedTo: { id: string; name: string | null } | null }

const labels: Record<string, string> = { FIRST_SERVICE: 'First service', WARRANTY_CHECK_IN: 'Warranty check-in', DOCUMENTS_CONFIRMATION: 'Documents confirmation', CUSTOMER_FEEDBACK: 'Customer feedback follow-up' }

export function AfterSalesWorkspace({ tasks, eligibleDeliveries, canUpdate }: { tasks: Task[]; eligibleDeliveries: Delivery[]; canUpdate: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const form = event.currentTarget
    const payload = Object.fromEntries(new FormData(form).entries())
    setBusy(true); setError('')
    try {
      const dueAt = new Date(String(payload.dueAt)).toISOString()
      const response = await fetch('/api/admin/after-sales', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, dueAt }) })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.error?.code ?? 'Unable to schedule the follow-up.')
      form.reset(); router.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to schedule the follow-up.') }
    finally { setBusy(false) }
  }

  async function complete(task: Task) {
    if (busy) return
    setBusy(true); setError('')
    try {
      const response = await fetch(`/api/admin/after-sales/${encodeURIComponent(task.id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ version: task.version }) })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.error?.code ?? 'Unable to complete the follow-up.')
      router.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to complete the follow-up.') }
    finally { setBusy(false) }
  }

  return <>
    {error ? <p role="alert" className="admin-form-message is-error">{error}</p> : null}
    {canUpdate && eligibleDeliveries.length ? <section className="admin-panel admin-panel--full"><header><h2>Schedule after-sales care</h2></header><div className="admin-panel__body">
      <form className="admin-form" onSubmit={createTask}>
        <label>Delivered vehicle<select name="deliveryCaseId" required>{eligibleDeliveries.map((delivery) => <option key={delivery.id} value={delivery.id}>{delivery.referenceNumber} · {delivery.vehicle.stockNumber} · {delivery.vehicle.shortTitle}</option>)}</select></label>
        <label>Follow-up type<select name="type" required><option value="FIRST_SERVICE">First service</option><option value="WARRANTY_CHECK_IN">Warranty check-in</option><option value="DOCUMENTS_CONFIRMATION">Documents confirmation</option><option value="CUSTOMER_FEEDBACK">Customer feedback follow-up</option></select></label>
        <label>Due date and time<input name="dueAt" type="datetime-local" required /></label>
        <button className="admin-button" disabled={busy}>Schedule internal task</button>
      </form>
      <p>Tasks contain no customer message body or contact information. Staff contact and communication preferences are managed separately.</p>
    </div></section> : null}
    <section className="admin-panel admin-panel--full"><header><h2>After-sales follow-ups</h2></header><div className="admin-panel__body">
      {tasks.length ? <div className="admin-table-wrap"><table className="admin-table"><caption>Showroom-scoped internal follow-up queue</caption><thead><tr><th>Task</th><th>Delivered vehicle</th><th>Due</th><th>Status</th></tr></thead><tbody>{tasks.map((task) => <tr key={task.id}><td><strong>{labels[task.type] ?? task.type}</strong><small><br />{task.deliveryCase.referenceNumber} · {task.showroom.name}<br />Assigned to {task.assignedTo?.name ?? 'staff'}</small></td><td>{task.deliveryCase.vehicle.stockNumber} · {task.deliveryCase.vehicle.year} {task.deliveryCase.vehicle.shortTitle}</td><td>{new Date(task.dueAt).toLocaleString()}</td><td>{task.status === 'OPEN' && canUpdate ? <button className="admin-button admin-button--secondary" disabled={busy} onClick={() => void complete(task)}>Complete task</button> : task.status.replaceAll('_', ' ')}</td></tr>)}</tbody></table></div> : <p>No after-sales tasks are scheduled in your showroom scope.</p>}
    </div></section>
  </>
}
