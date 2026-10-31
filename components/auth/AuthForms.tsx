'use client'

import { ArrowRight, CheckCircle2, Eye, EyeOff, LoaderCircle, Mail, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useId, useState, type FormEvent } from 'react'
import { useHydrated } from '@/lib/hooks/use-hydrated'

type ApiPayload = { message?: string; error?: { message?: string; fields?: Record<string, string[]> }; data?: Record<string, unknown> }

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const payload = await response.json().catch(() => ({})) as ApiPayload
  return { response, payload }
}

function PasswordInput({ name = 'password', label = 'Password', autoComplete = 'current-password' }: { name?: string; label?: string; autoComplete?: string }) {
  const [visible, setVisible] = useState(false)
  const id = useId()
  return <div className="auth-password-group"><label htmlFor={id}>{label}</label><span className="password-field"><input id={id} name={name} type={visible ? 'text' : 'password'} autoComplete={autoComplete} required /><button type="button" aria-label={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible((value) => !value)}>{visible ? <EyeOff /> : <Eye />}</button></span></div>
}

export function LoginForm({ callbackUrl, googleEnabled }: { callbackUrl: string; googleEnabled: boolean }) {
  const router = useRouter()
  const hydrated = useHydrated()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    const data = new FormData(event.currentTarget)
    const result = await signIn('credentials', { email: data.get('email'), password: data.get('password'), redirect: false, callbackUrl })
    setBusy(false)
    if (!result?.ok) {
      if (result?.error?.includes('EMAIL_NOT_VERIFIED')) setMessage('Verify your email before signing in. You can request a fresh link below.')
      else if (result?.error?.includes('ACCOUNT_INACTIVE')) setMessage('This account is not currently active. Contact customer support.')
      else setMessage('The email address or password is incorrect.')
      return
    }
    router.push(callbackUrl)
    router.refresh()
  }

  return <>
    {googleEnabled ? <button className="auth-provider" type="button" onClick={() => signIn('google', { callbackUrl })}><span>G</span> Continue with Google</button> : null}
    {googleEnabled ? <div className="auth-divider"><span>or use email</span></div> : null}
    <form className="auth-form" onSubmit={submit}>
      <label>Email address<input name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></label>
      <PasswordInput />
      <div className="auth-form__aside"><Link href="/forgot-password">Forgot password?</Link></div>
      {message ? <p className="form-status form-status--error" role="alert">{message}</p> : null}
      <button className="gold-button auth-submit" disabled={busy || !hydrated}>{busy ? <LoaderCircle className="spin" /> : <>Sign in <ArrowRight /></>}</button>
    </form>
    <p className="auth-switch">New to Car Dealership Demo? <Link href={`/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`}>Create an account</Link></p>
    <ResendVerification compact />
  </>
}

export function SignupForm({ callbackUrl }: { callbackUrl: string }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    const data = new FormData(event.currentTarget)
    const { response, payload } = await postJson('/api/auth/register', {
      name: data.get('name'), email: data.get('email'), phone: data.get('phone'), password: data.get('password'),
      termsAccepted: data.get('termsAccepted') === 'on', marketingConsent: data.get('marketingConsent') === 'on',
    })
    setBusy(false)
    if (!response.ok) { setMessage(payload.error?.message ?? 'Your account could not be created.'); return }
    setSuccess(true)
    setMessage(payload.message ?? 'Check your email to verify your account.')
  }
  if (success) return <div className="auth-success"><CheckCircle2 /><h3>Check your inbox</h3><p>{message}</p><Link className="gold-button" href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}>Continue to sign in</Link></div>
  return <>
    <form className="auth-form auth-form--signup" onSubmit={submit}>
      <div className="auth-form__row"><label>Full name<input name="name" autoComplete="name" required /></label><label>Mobile number<input name="phone" inputMode="tel" autoComplete="tel" placeholder="98765 43210" required /></label></div>
      <label>Email address<input name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></label>
      <PasswordInput autoComplete="new-password" />
      <p className="password-hint">Use 12+ characters with uppercase, lowercase, number and symbol.</p>
      <label className="check-field"><input name="termsAccepted" type="checkbox" required /><span>I agree to the <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>.</span></label>
      <label className="check-field"><input name="marketingConsent" type="checkbox" /><span>Send me useful new-arrival and price updates. Optional.</span></label>
      {message ? <p className="form-status form-status--error" role="alert">{message}</p> : null}
      <button className="gold-button auth-submit" disabled={busy}>{busy ? <LoaderCircle className="spin" /> : <>Create account <ArrowRight /></>}</button>
    </form>
    <p className="auth-switch">Already registered? <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}>Sign in</Link></p>
  </>
}

export function ResendVerification({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(!compact)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  if (!open) return <button className="auth-text-button" type="button" onClick={() => setOpen(true)}>Resend verification email</button>
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true)
    const data = new FormData(event.currentTarget)
    const { payload } = await postJson('/api/auth/resend-verification', { email: data.get('email') })
    setMessage(payload.message ?? 'Check your inbox.'); setBusy(false)
  }
  return <form className="auth-inline-form" onSubmit={submit}><label>Email for verification<input name="email" type="email" required /></label><button className="dark-button" disabled={busy}>{busy ? 'Sending...' : 'Resend'}</button>{message ? <p className="form-status" role="status">{message}</p> : null}</form>
}

export function ForgotPasswordForm() {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true)
    const data = new FormData(event.currentTarget)
    const { payload } = await postJson('/api/auth/forgot-password', { email: data.get('email') })
    setMessage(payload.message ?? 'Check your inbox.'); setBusy(false)
  }
  return <form className="auth-form" onSubmit={submit}><label>Email address<input name="email" type="email" autoComplete="email" required /></label>{message ? <p className="auth-notice" role="status"><Mail />{message}</p> : null}<button className="gold-button auth-submit" disabled={busy}>{busy ? <LoaderCircle className="spin" /> : <>Send reset link <ArrowRight /></>}</button><p className="auth-switch"><Link href="/login">Back to sign in</Link></p></form>
}

export function VerifyEmailClient({ token }: { token?: string }) {
  const [state, setState] = useState<'working' | 'success' | 'error'>(token ? 'working' : 'error')
  const [message, setMessage] = useState(token ? 'Confirming your secure link...' : 'This verification link is missing its token.')
  useEffect(() => {
    if (!token) return
    postJson('/api/auth/verify-email', { token }).then(({ response, payload }) => {
      setState(response.ok ? 'success' : 'error')
      setMessage(payload.message ?? payload.error?.message ?? 'The link could not be verified.')
    })
  }, [token])
  return <div className={`auth-result auth-result--${state}`}>{state === 'working' ? <LoaderCircle className="spin" /> : state === 'success' ? <CheckCircle2 /> : <ShieldCheck />}<h3>{state === 'success' ? 'Account verified' : state === 'working' ? 'Verifying email' : 'Verification needed'}</h3><p>{message}</p>{state === 'success' ? <Link className="gold-button" href="/login">Sign in</Link> : <ResendVerification />}</div>
}

export function ResetPasswordForm({ token }: { token?: string }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(token ? '' : 'This reset link is invalid.')
  const [success, setSuccess] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!token) return
    setBusy(true); setMessage('')
    const data = new FormData(event.currentTarget)
    if (data.get('password') !== data.get('confirmPassword')) { setMessage('Passwords do not match.'); setBusy(false); return }
    const { response, payload } = await postJson('/api/auth/reset-password', { token, password: data.get('password') })
    setBusy(false); setMessage(payload.message ?? payload.error?.message ?? 'Password could not be updated.'); setSuccess(response.ok)
  }
  if (success) return <div className="auth-success"><CheckCircle2 /><h3>Password updated</h3><p>{message}</p><Link className="gold-button" href="/login">Sign in securely</Link></div>
  return <form className="auth-form" onSubmit={submit}><PasswordInput autoComplete="new-password" label="New password" /><PasswordInput name="confirmPassword" autoComplete="new-password" label="Confirm password" />{message ? <p className="form-status form-status--error">{message}</p> : null}<button className="gold-button auth-submit" disabled={busy || !token}>{busy ? <LoaderCircle className="spin" /> : <>Update password <ArrowRight /></>}</button></form>
}
