'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

type FollowUp = {
  id: string; title: string; dueAt: string; completedAt: string | null;
  assignedTo: { id: string; name: string | null } | null;
  createdBy: { name: string | null };
}
type Assignee = { id: string; name: string | null; email: string }

export function CustomerFollowUps({ customerId, tasks, assignees }: {
  customerId: string; tasks: FollowUp[]; assignees: Assignee[]
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [title, setTitle] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [assignedToId, setAssignedToId] = useState(assignees[0]?.id ?? '')

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || !title.trim() || !dueAt) return
    setBusy('new'); setMessage(''); setIsError(false)
    try {
      const response = await fetch(`/api/admin/customers/${encodeURIComponent(customerId)}/follow-ups`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(), dueAt: new Date(dueAt).toISOString(),
          ...(assignedToId ? { assignedToId } : {}),
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error?.message ?? 'Could not create follow-up.')
      setMessage('Follow-up created. No customer message has been sent.')
      setTitle(''); setDueAt('')
      router.refresh()
    } catch (e) {
      setIsError(true); setMessage(e instanceof Error ? e.message : 'Follow-up could not be created.')
    } finally { setBusy(null) }
  }

  async function complete(id: string) {
    if (busy) return
    setBusy(id); setMessage(''); setIsError(false)
    try {
      const response = await fetch(`/api/admin/customers/${encodeURIComponent(customerId)}/follow-ups/${encodeURIComponent(id)}/complete`, {
        method: 'POST',
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error?.message ?? 'Could not complete follow-up.')
      setMessage(payload.message ?? 'Follow-up completed.')
      router.refresh()
    } catch (e) {
      setIsError(true); setMessage(e instanceof Error ? e.message : 'Could not close follow-up.')
    } finally { setBusy(null) }
  }

  return <section className="admin-panel admin-panel--full">
    <header><h2>Internal customer follow-ups</h2></header>
    <div className="admin-panel__body admin-detail-stack">
      <p>Tasks are private staff reminders; creating or completing one does not email, message, call or otherwise contact the customer.</p>
      <form className="admin-form" onSubmit={create}>
        <label>Task title
          <input value={title} onChange={(e) => setTitle(e.target.value)} minLength={5} maxLength={180}
            disabled={Boolean(busy)} required placeholder="Review the customer's enquiry" />
        </label>
        <label>Due date and time
          <input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)}
            disabled={Boolean(busy)} required />
        </label>
        <label>Assigned administrator
          <select value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)} disabled={Boolean(busy)}>
            {assignees.map((item) => <option key={item.id} value={item.id}>{item.name ?? item.email}</option>)}
          </select>
        </label>
        <button className="admin-button" type="submit" disabled={Boolean(busy) || !assignees.length}>
          {busy === 'new' ? 'Creating…' : 'Add follow-up'}
        </button>
      </form>
      {message ? <p className={`admin-form-message${isError ? ' is-error' : ''}`}
        role={isError ? 'alert' : 'status'} aria-live="polite">{message}</p> : null}
      <h3>Recent follow-ups ({tasks.length})</h3>
      {tasks.length ? <ul>
        {tasks.map((task) => <li key={task.id} style={{ marginBlock: 12, paddingBottom: 12, borderBottom: '1px solid var(--admin-border)' }}>
          <strong>{task.title}</strong>
          <p>Due: <time dateTime={task.dueAt}>{new Date(task.dueAt).toLocaleString('en-IN')}</time> · Assigned: {task.assignedTo?.name ?? 'Unassigned'}</p>
          <p>{task.completedAt ? 'Completed' : 'Pending'}</p>
          {!task.completedAt ? <button type="button" className="admin-button admin-button--secondary"
            disabled={Boolean(busy)} onClick={() => complete(task.id)}>
            {busy === task.id ? 'Saving…' : 'Mark complete'}
          </button> : null}
        </li>)}
      </ul> : <p>No internal follow-up tasks for this customer.</p>}
    </div>
  </section>
}
