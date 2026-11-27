'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

type Check = { code: string; category: string; label: string; critical: boolean; result: string; remarks: string }
type Assessment = {
  total: number; completed: number; unchecked: string[]; failures: string[];
  criticalFailures: string[]; missingRemarks: string[]; canSubmit: boolean; canApprove: boolean
}
const resultOptions = [
  { value: 'NOT_CHECKED', label: 'Not checked' },
  { value: 'PASS', label: 'Pass' },
  { value: 'FAIL', label: 'Fail' },
  { value: 'NOT_APPLICABLE', label: 'Not applicable' },
]

export function InspectionWorkspace({
  inspectionId, version, status, checks, assessment, canEdit, canReview,
  inspectorName, reviewerName, reviewNote,
}: {
  inspectionId: string; version: number; status: string; checks: Check[];
  assessment: Assessment; canEdit: boolean; canReview: boolean;
  inspectorName: string; reviewerName: string | null; reviewNote: string
}) {
  const router = useRouter()
  const [currentVersion, setCurrentVersion] = useState(version)
  const [currentStatus, setCurrentStatus] = useState(status)
  const [values, setValues] = useState<Record<string, { result: string; remarks: string }>>(
    Object.fromEntries(checks.map((item) => [item.code, { result: item.result, remarks: item.remarks }]))
  )
  const [saved, setSaved] = useState<Record<string, { result: string; remarks: string }>>(
    Object.fromEntries(checks.map((item) => [item.code, { result: item.result, remarks: item.remarks }]))
  )
  const [reason, setReason] = useState(reviewNote)
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const editable = canEdit && (currentStatus === 'DRAFT' || currentStatus === 'IN_PROGRESS')
  const reviewable = canReview && currentStatus === 'READY_FOR_REVIEW'
  const categories = useMemo(() => [...new Set(checks.map((item) => item.category))], [checks])
  const progress = checks.reduce((count, check) =>
    count + (saved[check.code]?.result !== 'NOT_CHECKED' ? 1 : 0), 0)
  const failedChecks = checks.filter((check) => saved[check.code]?.result === 'FAIL')
  const missingRemarks = failedChecks.filter((check) => !saved[check.code]?.remarks.trim())
  const canSubmit = progress === checks.length && missingRemarks.length === 0

  async function send(url: string, body: object, method: 'PATCH' | 'POST' = 'POST') {
    const response = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) throw new Error(payload?.error?.message ?? 'Operation failed. Refresh and try again.')
    return payload
  }
  async function saveCheck(code: string) {
    if (busy || !editable) return
    setBusy(code); setMessage(''); setIsError(false)
    try {
      const input = values[code]
      const payload = await send(`/api/admin/inspections/${encodeURIComponent(inspectionId)}/checks`,
        { code, ...input, version: currentVersion }, 'PATCH')
      setCurrentVersion(payload.data.version)
      setSaved((prev) => ({ ...prev, [code]: { ...input } }))
      setMessage('Check saved.')
      router.refresh()
    } catch (e) {
      setIsError(true); setMessage(e instanceof Error ? e.message : 'Check could not be saved.')
    } finally { setBusy('') }
  }
  async function submit() {
    if (busy || !editable) return
    setBusy('submit'); setMessage(''); setIsError(false)
    try {
      const payload = await send(`/api/admin/inspections/${encodeURIComponent(inspectionId)}/submit`, { version: currentVersion })
      setCurrentStatus('READY_FOR_REVIEW')
      setCurrentVersion(payload.data.version)
      setMessage('Inspection submitted to an administrator for review.')
      router.refresh()
    } catch (e) {
      setIsError(true); setMessage(e instanceof Error ? e.message : 'Could not submit inspection.')
    } finally { setBusy('') }
  }
  async function review(approved: boolean) {
    if (busy || !reviewable) return
    setBusy(approved ? 'approve' : 'reject'); setMessage(''); setIsError(false)
    try {
      const payload = await send(`/api/admin/inspections/${encodeURIComponent(inspectionId)}/review`, {
        approved, reviewNote: reason, version: currentVersion,
      })
      setCurrentStatus(payload.data.status)
      setCurrentVersion(payload.data.version)
      setMessage(`Review recorded: ${payload.data.status.toLowerCase()}.`)
      router.refresh()
    } catch (e) {
      setIsError(true); setMessage(e instanceof Error ? e.message : 'Review could not be saved.')
    } finally { setBusy('') }
  }

  return <div className="admin-detail-stack">
    <section className="admin-panel admin-panel--full">
      <header><h2>Inspection overview</h2></header>
      <div className="admin-panel__body">
        <p><strong>{progress} / {checks.length} checks saved</strong> · Inspector: {inspectorName} · Status: {currentStatus.replaceAll('_', ' ')}</p>
        <progress value={progress} max={checks.length} aria-label="Saved inspection checks" style={{ width: '100%' }} />
        <p>Initial evidence: {assessment.completed}/{assessment.total} · Failed checks: {failedChecks.length} · Critical: {failedChecks.filter((c) => c.critical).length}</p>
        <p>Every check needs a result. A failed check needs a written explanation. Failed checks cannot be approved without remediation.</p>
        {reviewerName ? <p>Reviewed by: {reviewerName}</p> : null}
        {reviewNote ? <p>Review notes: {reviewNote}</p> : null}
        {message ? <p className={`admin-form-message${isError ? ' is-error' : ''}`} role={isError ? 'alert' : 'status'} aria-live="polite">{message}</p> : null}
      </div>
    </section>
    {categories.map((category) => <section className="admin-panel admin-panel--full" key={category}>
      <header><h2>{category === 'RoadTest' ? 'Road Test' : category}</h2></header>
      <div className="admin-panel__body">
        <div className="admin-detail-stack">
          {checks.filter((item) => item.category === category).map((check) => {
            const draft = values[check.code]
            const isDirty = draft.result !== saved[check.code]?.result || draft.remarks !== saved[check.code]?.remarks
            return <div key={check.code} style={{ padding: '12px 0', borderBottom: '1px solid var(--admin-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <strong>{check.label} {check.critical ? '(critical)' : ''}</strong>
                <small>{check.code}</small>
              </div>
              <div className="admin-form-grid">
                <label>Result
                  <select disabled={!editable || Boolean(busy)} value={draft.result}
                    onChange={(e) => setValues((prev) => ({ ...prev, [check.code]: { ...prev[check.code], result: e.target.value } }))}>
                    {resultOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <label>Remarks
                  <textarea maxLength={1000} rows={2} disabled={!editable || Boolean(busy)} value={draft.remarks}
                    onChange={(e) => setValues((prev) => ({ ...prev, [check.code]: { ...prev[check.code], remarks: e.target.value } }))}/>
                </label>
                {editable ? <button type="button" className="admin-button admin-button--secondary"
                  disabled={!isDirty || Boolean(busy) || (draft.result === 'FAIL' && !draft.remarks.trim())}
                  onClick={() => saveCheck(check.code)}>{busy === check.code ? 'Saving…' : 'Save check'}</button> : null}
              </div>
            </div>
          })}
        </div>
      </div>
    </section>)}
    {editable ? <section className="admin-panel admin-panel--full">
      <header><h2>Submit for review</h2></header>
      <div className="admin-panel__body">
        <p>{canSubmit ? 'Checklist complete. Submission locks editing until the next inspection cycle.' :
          'Complete and save all checks, including reasons for failures, before submitting.'}</p>
        <button className="admin-button" type="button" disabled={!canSubmit || Boolean(busy)}
          onClick={submit}>{busy === 'submit' ? 'Submitting…' : 'Submit inspection'}</button>
      </div>
    </section> : null}
    {reviewable ? <section className="admin-panel admin-panel--full">
      <header><h2>Independent staff review</h2></header>
      <div className="admin-panel__body admin-form">
        <label>Review notes
          <textarea maxLength={2000} value={reason} disabled={Boolean(busy)}
            onChange={(e) => setReason(e.target.value)} placeholder="Explain rejection reasons or record approval notes." />
        </label>
        <p>Approval requires every check to be complete and no failed results. A reviewer cannot approve their own inspection.</p>
        <button type="button" className="admin-button" disabled={Boolean(busy) || !canSubmit || failedChecks.length > 0}
          onClick={() => review(true)}>{busy === 'approve' ? 'Approving…' : 'Approve inspection'}</button>
        <button type="button" className="admin-button admin-button--secondary"
          disabled={Boolean(busy) || reason.trim().length < 10} onClick={() => review(false)}>
          {busy === 'reject' ? 'Rejecting…' : 'Reject with reason'}
        </button>
      </div>
    </section> : null}
  </div>
}
