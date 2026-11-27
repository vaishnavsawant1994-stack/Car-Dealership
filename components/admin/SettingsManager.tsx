'use client'

import { Save } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Setting = {
  id: string
  key: string
  value: string
  category: string
  version: number
  editable: boolean
}

export function SettingsManager({ settings }: { settings: Setting[] }) {
  const router = useRouter()
  const [message, setMessage] = useState('')

  async function save(item: Setting, value: string) {
    if (!item.editable) return
    setMessage('')
    try {
      const response = await fetch(`/api/admin/settings/${encodeURIComponent(item.key)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value, version: item.version }),
      })
      const body = await response.json().catch(() => null)
      setMessage(body?.message ?? body?.error?.message ?? 'Unable to update this setting.')
      if (response.ok) router.refresh()
    } catch {
      setMessage('The settings service could not be reached. Please try again.')
    }
  }

  return <div className="admin-form">
    <p className="admin-form-message" role="status" aria-live="polite">{message}</p>
    {settings.length === 0 ? <p>No approved settings are available in this category.</p> : null}
    {settings.map((item) => <SettingRow key={item.id} item={item} save={save} />)}
  </div>
}

function SettingRow({ item, save }: { item: Setting; save: (item: Setting, value: string) => Promise<void> }) {
  const [value, setValue] = useState(item.value)
  const [pending, setPending] = useState(false)

  async function onSave() {
    setPending(true)
    try { await save(item, value) } finally { setPending(false) }
  }
  return <section className="admin-panel admin-panel--full">
    <div className="admin-panel__body">
      <label htmlFor={`setting-${item.id}`}>{item.key.replaceAll('_', ' ')}</label>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          id={`setting-${item.id}`}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          disabled={!item.editable || pending}
          readOnly={!item.editable}
          aria-readonly={!item.editable}
          style={{ flex: 1 }}
        />
        {item.editable ? <button
          className="admin-button"
          type="button"
          onClick={onSave}
          disabled={pending || value === item.value}
          aria-label={`Save ${item.key.replaceAll('_', ' ')}`}
        ><Save /></button> : null}
      </div>
      {!item.editable ? <p className="admin-muted">Read-only setting. Changes require the approved configuration workflow.</p> : null}
    </div>
  </section>
}
