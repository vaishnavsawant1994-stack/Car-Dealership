'use client'

import Link from 'next/link'
import { Building2, CheckCircle2, LoaderCircle, RefreshCw, Save, ShieldAlert } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import {
  organisationFields, organisationKeys,
  type OrganisationGroup, type OrganisationKey, type OrganisationSettings,
} from '@/lib/admin/organisation-profile'

type ShowroomSummary = {
  id: string; name: string; address: string; city: string; state: string; country: string
  phone: string; email: string; hours: string
}

type Profile = {
  settings: OrganisationSettings
  primaryShowroom: ShowroomSummary | null
  showroomCount: number
}

type ResponseBody = {
  data?: Profile
  message?: string
  error?: { code?: string; message?: string; fields?: Record<string, string[]> }
}

const groups: Array<{ group: OrganisationGroup; title: string; detail: string }> = [
  { group: 'Identity', title: 'Business identity', detail: 'The approved operating identity for this dealership demonstration.' },
  { group: 'Branding', title: 'Brand assets', detail: 'Display copy and existing, approved local brand media.' },
  { group: 'Contact', title: 'Contact details', detail: 'Demo environments accept fictional contact details only; external delivery stays disabled.' },
  { group: 'Preferences', title: 'Operating preferences', detail: 'Currency, time zone and locale for business presentation.' },
  { group: 'Registration', title: 'Registration details', detail: 'Reserved for an independently authorized commercial launch.' },
]

function valuesFrom(settings: OrganisationSettings) {
  return Object.fromEntries(organisationKeys.map((key) => [key, settings[key].value])) as Record<OrganisationKey, string>
}

export function OrganisationProfileManager({
  initial, canEdit, canManageShowrooms, hostedDemo,
}: {
  initial: Profile
  canEdit: boolean
  canManageShowrooms: boolean
  hostedDemo: boolean
}) {
  const router = useRouter()
  const [settings, setSettings] = useState(initial.settings)
  const [values, setValues] = useState<Record<OrganisationKey, string>>(() => valuesFrom(initial.settings))
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ message: string; error: boolean } | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const changes = organisationKeys.filter((key) => values[key] !== settings[key].value)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canEdit || !changes.length || saving) return
    setSaving(true)
    setFeedback(null)
    setFieldErrors({})
    try {
      const response = await fetch('/api/admin/organisation', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          changes: changes.map((key) => ({ key, value: values[key].trim(), version: settings[key].version })),
        }),
      })
      const body = (await response.json().catch(() => ({}))) as ResponseBody
      if (!response.ok || !body.data) {
        setFieldErrors(body.error?.fields ?? {})
        setFeedback({
          message: body.error?.message ?? 'Unable to save the business profile.',
          error: true,
        })
        return
      }
      setSettings(body.data.settings)
      setValues(valuesFrom(body.data.settings))
      setFeedback({ message: body.message ?? 'Business profile saved.', error: false })
      router.refresh()
    } catch {
      setFeedback({ message: 'Network error. Your changes were not saved.', error: true })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-detail-layout">
      <div className="admin-detail-stack">
        <form className="admin-form" onSubmit={submit}>
          {groups.map((section) => (
            <section className="admin-form-section" key={section.group}>
              <header>
                <h2>{section.title}</h2>
                <p>{section.detail}</p>
              </header>
              <div className="admin-form-grid">
                {organisationFields.filter((field) => field.group === section.group).map((field) => {
                  const protectedField = hostedDemo &&
                    ['business_registration_number', 'business_tax_identifier'].includes(field.key)
                  const disabled = saving || !canEdit || protectedField
                  const error = fieldErrors[field.key]?.join(' ')
                  return (
                    <label key={field.key} className={field.key === 'site_tagline' ? 'span-2' : undefined}>
                      {field.label}
                      {field.type === 'select' ? (
                        <select
                          name={field.key}
                          value={values[field.key]}
                          onChange={(event) => setValues((state) => ({ ...state, [field.key]: event.target.value }))}
                          disabled={disabled}
                          required={field.required}
                          aria-invalid={Boolean(error)}
                        >
                          {field.options?.map((value) => <option value={value} key={value}>{value}</option>)}
                        </select>
                      ) : (
                        <input
                          name={field.key}
                          value={values[field.key]}
                          onChange={(event) => setValues((state) => ({ ...state, [field.key]: event.target.value }))}
                          type={field.type}
                          maxLength={field.maxLength}
                          required={field.required}
                          disabled={disabled}
                          aria-invalid={Boolean(error)}
                          autoComplete="off"
                          placeholder={protectedField ? 'Not permitted in hosted demos' : undefined}
                        />
                      )}
                      {field.help ? <small style={{ color: 'var(--admin-muted)', fontWeight: 400 }}>{field.help}</small> : null}
                      {error ? <small role="alert" style={{ color: 'var(--admin-red)' }}>{error}</small> : null}
                    </label>
                  )
                })}
              </div>
            </section>
          ))}
          {feedback ? (
            <p className={'admin-form-message' + (feedback.error ? ' is-error' : '')} role="status" aria-live="polite">
              {feedback.error ? <ShieldAlert size={16} aria-hidden="true" /> : <CheckCircle2 size={16} aria-hidden="true" />}{' '}
              {feedback.message}
              {feedback.error ? ' Reload before retrying if another staff member changed this record.' : ''}
            </p>
          ) : null}
          <footer className="admin-form-footer">
            <span style={{ marginRight: 'auto', alignSelf: 'center', color: 'var(--admin-muted)', fontSize: 12 }}>
              {changes.length} unsaved {changes.length === 1 ? 'field' : 'fields'}
            </span>
            <button
              type="button" className="admin-button admin-button--secondary"
              disabled={!changes.length || saving}
              onClick={() => { setValues(valuesFrom(settings)); setFieldErrors({}); setFeedback(null) }}
            >
              <RefreshCw aria-hidden="true" /> Discard changes
            </button>
            {canEdit ? (
              <button className="admin-button" type="submit" disabled={!changes.length || saving}>
                {saving ? <LoaderCircle aria-hidden="true" /> : <Save aria-hidden="true" />}
                {saving ? 'Saving…' : 'Save profile'}
              </button>
            ) : null}
          </footer>
        </form>
      </div>
      <aside className="admin-detail-stack">
        <section className="admin-panel admin-panel--full">
          <header><h2>Primary showroom</h2><Building2 aria-hidden="true" size={19} /></header>
          <div className="admin-panel__body">
            {initial.primaryShowroom ? (
              <div className="admin-form" style={{ gap: 9 }}>
                <strong>{initial.primaryShowroom.name}</strong>
                <span>{initial.primaryShowroom.address}, {initial.primaryShowroom.city}, {initial.primaryShowroom.state}, {initial.primaryShowroom.country}</span>
                <small style={{ color: 'var(--admin-muted)' }}>{initial.primaryShowroom.hours}</small>
                <small style={{ color: 'var(--admin-muted)' }}>{initial.primaryShowroom.email}</small>
                <small style={{ color: 'var(--admin-muted)' }}>{initial.showroomCount} active showroom(s)</small>
              </div>
            ) : (
              <p style={{ color: 'var(--admin-muted)', fontSize: 13 }}>
                No active primary showroom is configured. Set one through the existing showroom manager.
              </p>
            )}
            {canManageShowrooms ? (
              <Link href="/admin/showrooms" className="admin-button admin-button--secondary" style={{ marginTop: 16 }}>
                Manage showrooms
              </Link>
            ) : null}
          </div>
        </section>
        <section className="admin-panel admin-panel--full">
          <header><h2>Access & publication</h2></header>
          <div className="admin-panel__body" style={{ display: 'grid', gap: 10, fontSize: 13 }}>
            <p>{canEdit ? 'Your role can update approved organisation fields.' : 'Your role has read-only access.'}</p>
            <p style={{ color: 'var(--admin-muted)' }}>Showroom details are maintained in the existing Showroom records, not copied into the business profile.</p>
            {hostedDemo ? (
              <p style={{ color: 'var(--admin-gold-soft)' }}>
                Protected demo: fictional names and reserved .test addresses only. No real messaging, registration identifiers or payments.
              </p>
            ) : (
              <p style={{ color: 'var(--admin-muted)' }}>Updates are saved with version checks and an audit entry.</p>
            )}
            <Link href="/admin/settings" className="admin-button admin-button--secondary">All settings</Link>
          </div>
        </section>
      </aside>
    </div>
  )
}
