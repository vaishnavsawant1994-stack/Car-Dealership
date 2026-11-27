'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type VehicleOption = { id: string; stockNumber: string; shortTitle: string }
export function InspectionStart({ vehicles }: { vehicles: VehicleOption[] }) {
  const router = useRouter()
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id ?? '')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  async function start() {
    if (!vehicleId || busy) return
    setBusy(true); setMessage('')
    try {
      const response = await fetch('/api/admin/inspections', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicleId }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.data?.id) {
        setMessage(payload?.error?.message ?? 'Could not start this inspection.')
        return
      }
      router.push('/admin/inspections/' + encodeURIComponent(payload.data.id))
      router.refresh()
    } catch {
      setMessage('Inspection service unavailable. Please try again.')
    } finally { setBusy(false) }
  }
  return <section className="admin-panel admin-panel--full">
    <header><h2>Start a vehicle inspection</h2></header>
    <div className="admin-panel__body">
      <label htmlFor="inspection-vehicle">Vehicle</label>
      <select id="inspection-vehicle" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
        {vehicles.map((v) => <option key={v.id} value={v.id}>{v.stockNumber} · {v.shortTitle}</option>)}
      </select>
      <button type="button" className="admin-button" disabled={busy || !vehicleId} onClick={start}>{busy ? 'Starting…' : 'Start / resume inspection'}</button>
      {message ? <p role="alert" className="admin-form-message is-error">{message}</p> : null}
      <p>Recent vehicles are shown here. Inspection evidence remains private to authorized staff.</p>
    </div>
  </section>
}
