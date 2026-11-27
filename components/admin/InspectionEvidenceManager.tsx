'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type CheckOption = { code: string; category: string; label: string }
type Evidence = {
  id: string; checkCode: string; originalName: string;
  mimeType: string; sizeBytes: number; createdAt: string
}

export function InspectionEvidenceManager({
  inspectionId, version, status, checks, initialEvidence,
}: {
  inspectionId: string; version: number; status: string;
  checks: CheckOption[]; initialEvidence: Evidence[]
}) {
  const router = useRouter()
  const [checkCode, setCheckCode] = useState(checks[0]?.code ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const editable = status === 'DRAFT' || status === 'IN_PROGRESS'
  const groups = [...new Set(checks.map((item) => item.category))]

  async function upload() {
    if (!editable || busy || !file || !checkCode) return
    setBusy(true); setMessage(''); setIsError(false)
    try {
      const body = new FormData()
      body.set('checkCode', checkCode)
      body.set('version', String(version))
      body.set('file', file)
      const response = await fetch(`/api/admin/inspections/${encodeURIComponent(inspectionId)}/evidence`, {
        method: 'POST', body,
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error?.message ?? 'Evidence could not be saved.')
      setFile(null)
      setMessage('Private evidence saved and associated with the selected check.')
      router.refresh()
    } catch (e) {
      setIsError(true)
      setMessage(e instanceof Error ? e.message : 'Evidence upload failed.')
    } finally { setBusy(false) }
  }

  return <section className="admin-panel admin-panel--full">
    <header><h2>Private inspection evidence</h2></header>
    <div className="admin-panel__body">
      <p>Photographs and documents remain private to authorized inspection staff. They are never copied to the public vehicle gallery.</p>
      {editable ? <div className="admin-form">
        <label>Checklist item
          <select value={checkCode} onChange={(event) => setCheckCode(event.target.value)} disabled={busy}>
            {groups.map((category) => <optgroup key={category} label={category === 'RoadTest' ? 'Road Test' : category}>
              {checks.filter((check) => check.category === category).map((check) => <option key={check.code} value={check.code}>
                {check.label}
              </option>)}
            </optgroup>)}
          </select>
        </label>
        <label>File (JPG, PNG, WebP or PDF; maximum 8 MB)
          <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" disabled={busy}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        </label>
        <button type="button" className="admin-button" disabled={!file || busy || !checkCode || initialEvidence.length >= 60}
          onClick={upload}>{busy ? 'Uploading…' : 'Upload private evidence'}</button>
      </div> : <p>Evidence uploads are locked after inspection submission.</p>}
      <p role={isError ? 'alert' : 'status'} aria-live="polite" className={isError ? 'admin-form-message is-error' : 'admin-form-message'}>{message}</p>
      <h3>Stored evidence ({initialEvidence.length}/60)</h3>
      {initialEvidence.length ? <ul>
        {initialEvidence.map((item) => <li key={item.id} style={{ marginBlock: 10 }}>
          <a href={`/api/admin/inspections/${encodeURIComponent(inspectionId)}/evidence/${encodeURIComponent(item.id)}`}>
            {item.originalName}
          </a>
          <small> · {item.checkCode} · {(item.sizeBytes / 1024).toFixed(1)} KB · {new Date(item.createdAt).toLocaleString('en-IN')}</small>
        </li>)}
      </ul> : <p>No evidence attached.</p>}
    </div>
  </section>
}
