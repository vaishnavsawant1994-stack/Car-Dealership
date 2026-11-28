'use client'

import { Check, CheckCheck } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

type NotificationItem = {
  id: string
  title: string
  message: string
  href: string | null
  readAt: string | null
  createdAt: string
}

export function NotificationList({ items }: { items: NotificationItem[] }) {
  const router = useRouter()
  const [rows, setRows] = useState(items)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [pending, setPending] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => setRows(items), [items])

  const unreadCount = rows.filter((item) => !item.readAt).length
  const visible = filter === 'unread' ? rows.filter((item) => !item.readAt) : rows

  async function markAll() {
    if (!unreadCount || pending) return
    setPending(true)
    setError('')
    try {
      const response = await fetch('/api/admin/notifications', { method: 'PATCH' })
      if (!response.ok) throw new Error('Could not mark notifications as read.')
      const readAt = new Date().toISOString()
      setRows((current) => current.map((item) => item.readAt ? item : { ...item, readAt }))
      router.refresh()
    } catch {
      setError('Could not update notifications. Please try again.')
    } finally {
      setPending(false)
    }
  }

  async function markOne(id: string) {
    if (pendingId || pending) return
    setPendingId(id)
    setError('')
    try {
      const response = await fetch(`/api/admin/notifications/${encodeURIComponent(id)}`, { method: 'PATCH' })
      if (!response.ok) throw new Error('Notification update failed.')
      const readAt = new Date().toISOString()
      setRows((current) => current.map((item) => item.id === id ? { ...item, readAt } : item))
      router.refresh()
    } catch {
      setError('Could not mark this notification as read. Please try again.')
    } finally {
      setPendingId(null)
    }
  }

  return <section aria-label="Your operational notifications">
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 16 }}>
      <button type="button" className="admin-button admin-button--secondary" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
        All ({rows.length})
      </button>
      <button type="button" className="admin-button admin-button--secondary" aria-pressed={filter === 'unread'} onClick={() => setFilter('unread')}>
        Unread ({unreadCount})
      </button>
      <button type="button" className="admin-button admin-button--secondary" disabled={!unreadCount || pending} onClick={markAll}>
        <CheckCheck size={18} aria-hidden="true" /> Mark all as read
      </button>
    </div>
    {error ? <p className="admin-form-message" role="alert">{error}</p> : null}
    <div className="admin-list" role="list">
      {visible.length === 0 ? <p role="status">No {filter === 'unread' ? 'unread' : 'recent'} notifications.</p> : null}
      {visible.map((item) => <article role="listitem" className="admin-panel admin-panel--full" key={item.id}>
        <div className="admin-panel__body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <h3>{item.title}</h3>
              <p>{item.message}</p>
              <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString('en-IN')}</time>
              <p>{item.readAt ? 'Read' : 'Unread'}</p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {item.href ? <Link href={item.href} className="admin-button admin-button--secondary">Open</Link> : null}
              {!item.readAt ? <button type="button" className="admin-button admin-button--secondary" disabled={pending || pendingId !== null} onClick={() => markOne(item.id)}>
                <Check size={18} aria-hidden="true" /> {pendingId === item.id ? 'Saving…' : 'Mark read'}
              </button> : null}
            </div>
          </div>
        </div>
      </article>)}
    </div>
  </section>
}
