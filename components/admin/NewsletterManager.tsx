'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { AdminStatus } from './AdminPrimitives'

type Subscriber = { id: string; email: string; status: string; source: string; consentedAt: string; active: boolean }
export function NewsletterManager({ subscribers }: { subscribers: Subscriber[] }) {
  const router = useRouter()
  const [message, setMessage] = useState('')
  async function update(id: string, status: string) {
    const response = await fetch(`/api/admin/newsletter/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    const body = await response.json()
    setMessage(body.message ?? body.error?.message)
    if (response.ok) router.refresh()
  }
  function statusOptions(status: string) { return <><option value="SUBSCRIBED" disabled>{status === 'SUBSCRIBED' ? 'SUBSCRIBED' : 'SUBSCRIBED (customer action required)'}</option><option>UNSUBSCRIBED</option><option>SUPPRESSED</option></> }
  return <>{message ? <p className="admin-form-message" role="status">{message}</p> : null}<div className="admin-table-wrap"><table className="admin-table"><caption>{subscribers.length} recent consent records; sending is disabled</caption><thead><tr><th>Email</th><th>Source</th><th>Consent date</th><th>Status</th><th>Action</th></tr></thead><tbody>{subscribers.map((item) => <tr key={item.id}><td>{item.email}</td><td>{item.source}</td><td>{new Date(item.consentedAt).toLocaleDateString('en-IN')}</td><td><AdminStatus value={item.status} /></td><td><select aria-label={`Update ${item.email}`} value={item.status} onChange={(event) => update(item.id, event.target.value)}>{statusOptions(item.status)}</select></td></tr>)}</tbody></table></div><div className="admin-mobile-cards">{subscribers.map((item) => <article className="admin-mobile-card" key={item.id}><header><h2>{item.email}</h2><AdminStatus value={item.status} /></header><p>{item.source} - {new Date(item.consentedAt).toLocaleDateString('en-IN')}</p><footer><select aria-label={`Update ${item.email}`} value={item.status} onChange={(event) => update(item.id, event.target.value)}>{statusOptions(item.status)}</select></footer></article>)}</div></>
}
