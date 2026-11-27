'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, type FormEvent } from 'react'

type DealStatus = 'OPEN' | 'NEGOTIATION' | 'WON' | 'LOST' | 'CANCELLED'
type AcceptanceMethod = 'SIGNED_ORDER_FORM' | 'CUSTOMER_EMAIL' | 'IN_PERSON_CONFIRMATION'
type LossReason = 'CUSTOMER_DECLINED' | 'PURCHASED_ELSEWHERE' | 'FINANCING_NOT_READY' | 'VEHICLE_UNAVAILABLE' | 'NO_RESPONSE' | 'DUPLICATE' | 'OTHER'

const acceptanceMethods: Array<{ value: AcceptanceMethod; label: string }> = [
  { value: 'SIGNED_ORDER_FORM', label: 'Signed order form recorded' },
  { value: 'CUSTOMER_EMAIL', label: 'Customer email confirmation recorded' },
  { value: 'IN_PERSON_CONFIRMATION', label: 'In-person confirmation recorded' },
]
const lossReasons: Array<{ value: LossReason; label: string }> = [
  { value: 'CUSTOMER_DECLINED', label: 'Customer declined' },
  { value: 'PURCHASED_ELSEWHERE', label: 'Purchased elsewhere' },
  { value: 'FINANCING_NOT_READY', label: 'Financing not ready' },
  { value: 'VEHICLE_UNAVAILABLE', label: 'Vehicle unavailable' },
  { value: 'NO_RESPONSE', label: 'No response' },
  { value: 'DUPLICATE', label: 'Duplicate enquiry' },
  { value: 'OTHER', label: 'Other' },
]

export function SalesDealLifecycleControls({ id, status, version }: { id: string; status: DealStatus; version: number }) {
  const router = useRouter()
  const [target, setTarget] = useState<DealStatus>(status === 'OPEN' ? 'NEGOTIATION' : 'OPEN')
  const [acceptanceMethod, setAcceptanceMethod] = useState<AcceptanceMethod | ''>('')
  const [lossReason, setLossReason] = useState<LossReason | ''>('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState(false)

  useEffect(() => setTarget(status === 'OPEN' ? 'NEGOTIATION' : 'OPEN'), [status])
  const terminal = ['WON', 'LOST', 'CANCELLED'].includes(status)
  const choices: DealStatus[] = status === 'OPEN'
    ? ['NEGOTIATION', 'LOST', 'CANCELLED']
    : status === 'NEGOTIATION' ? ['OPEN', 'WON', 'LOST', 'CANCELLED'] : []

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || terminal || !choices.includes(target)) return
    setBusy(true); setMessage(''); setError(false)
    try {
      const body = { version, status: target,
        ...(target === 'WON' ? { acceptanceMethod } : {}),
        ...(target === 'LOST' ? { lossReason } : {}) }
      const response = await fetch(`/api/admin/deals/${encodeURIComponent(id)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.error?.message ?? 'Unable to update this deal.')
      setMessage('Deal status updated. Finance, payment, and delivery still require their own workflows.')
      router.refresh()
    } catch (cause) {
      setError(true); setMessage(cause instanceof Error ? cause.message : 'Unable to update this deal.')
    } finally { setBusy(false) }
  }

  if (terminal) return <p><strong>Closed:</strong> {status}. This record is retained in the audit timeline.</p>
  return <form className="admin-form" onSubmit={save}>
    <label>Next status
      <select value={target} onChange={(event) => setTarget(event.target.value as DealStatus)} disabled={busy}>
        {choices.map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}
      </select>
    </label>
    {target === 'WON' ? <label>Acceptance method recorded
      <select required value={acceptanceMethod} onChange={(event) => setAcceptanceMethod(event.target.value as AcceptanceMethod | '')} disabled={busy}>
        <option value="">Choose the evidence already recorded</option>
        {acceptanceMethods.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
      </select>
    </label> : null}
    {target === 'LOST' ? <label>Reason
      <select required value={lossReason} onChange={(event) => setLossReason(event.target.value as LossReason | '')} disabled={busy}>
        <option value="">Choose a reason</option>
        {lossReasons.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
      </select>
    </label> : null}
    <button className="admin-button" type="submit" disabled={busy || !choices.includes(target) ||
      (target === 'WON' && !acceptanceMethod) || (target === 'LOST' && !lossReason)}>{busy ? 'Saving…' : 'Update deal'}</button>
    {message ? <p role={error ? 'alert' : 'status'} className={error ? 'admin-form-message is-error' : 'admin-form-message'}>{message}</p> : null}
  </form>
}
