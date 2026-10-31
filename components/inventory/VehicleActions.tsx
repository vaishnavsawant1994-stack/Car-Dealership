'use client'

import { CalendarDays, Check, Heart, MessageCircle, Scale, X } from 'lucide-react'
import Link from 'next/link'
import { FormEvent, useState } from 'react'

type FormMode = 'enquiry' | 'test-drive'

export function VehicleActions({ vehicleId, slug, title }: { vehicleId: string; slug: string; title: string }) {
  const [mode, setMode] = useState<FormMode | null>(null)
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!mode) return
    setStatus('submitting')
    const form = new FormData(event.currentTarget)
    const payload = Object.fromEntries(form)
    payload.vehicleId = vehicleId
    payload.consent = form.get('consent') === 'on' ? 'true' : 'false'
    const response = await fetch(mode === 'enquiry' ? '/api/inquiries' : '/api/test-drives', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setStatus(response.ok ? 'success' : 'error')
  }

  return (
    <>
      <div className="vehicle-actions">
        <button type="button" onClick={() => setMode('enquiry')}><MessageCircle />Enquire</button>
        <button className="gold-button" type="button" onClick={() => setMode('test-drive')}><CalendarDays />Book Test Drive</button>
        <button type="button" aria-label={`Add ${title} to favourites`}><Heart />Favourite</button>
        <Link href={`/compare?vehicles=${slug}`}><Scale />Compare</Link>
      </div>
      {mode ? <div className="vehicle-form-modal" role="dialog" aria-modal="true" aria-labelledby="vehicle-form-title"><button className="modal-backdrop" type="button" aria-label="Close form" onClick={() => { setMode(null); setStatus('idle') }} /><form onSubmit={submit}><header><div><small>{title}</small><h2 id="vehicle-form-title">{mode === 'enquiry' ? 'Vehicle Enquiry' : 'Book a Test Drive'}</h2></div><button type="button" aria-label="Close form" onClick={() => { setMode(null); setStatus('idle') }}><X /></button></header>{status === 'success' ? <div className="vehicle-form-success"><Check /><h3>Request received</h3><p>Our Car Dealership Demo team will contact you shortly.</p></div> : <><div className="vehicle-form-grid"><label>Full Name<input name="name" autoComplete="name" required minLength={2} /></label><label>Phone<input name="phone" inputMode="tel" autoComplete="tel" required pattern="[0-9+ ]{10,15}" /></label><label>Email<input name="email" type="email" autoComplete="email" required /></label>{mode === 'test-drive' ? <><label>Preferred Date<input name="preferredDate" type="date" min={new Date().toISOString().slice(0, 10)} required /></label><label>Preferred Time<select name="preferredTime" required defaultValue=""><option value="" disabled>Select a time</option><option>10:00 AM - 12:00 PM</option><option>12:00 PM - 2:00 PM</option><option>2:00 PM - 4:00 PM</option><option>4:00 PM - 6:00 PM</option></select></label></> : null}<label className="vehicle-form-message">Message<textarea name="message" required={mode === 'enquiry'} defaultValue={`I am interested in the ${title}.`} /></label></div><label className="vehicle-form-consent"><input name="consent" type="checkbox" required />I consent to Car Dealership Demo contacting me about this vehicle.</label>{status === 'error' ? <p className="form-status form-status--error">We could not submit your request. Please check the fields and try again.</p> : null}<button className="gold-button vehicle-form-submit" type="submit" disabled={status === 'submitting'}>{status === 'submitting' ? 'Submitting...' : mode === 'enquiry' ? 'Send Enquiry' : 'Request Test Drive'}</button></>}</form></div> : null}
    </>
  )
}
