import 'server-only'
import { businessIdentity } from '@/lib/constants/business'

type EmailMessage = {
  to: string
  subject: string
  html: string
  previewUrl?: string
}

export type EmailResult = { delivered: boolean; preview: boolean; providerId?: string }

export type LeadNotificationDetails = {
  reference: string
  customerName: string
  customerEmail: string
  customerPhone: string
  vehicleTitle: string
  vehicleStockNumber?: string | null
  message?: string | null
  preferredDate?: Date | string | null
  preferredTime?: string | null
}

const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001'
const leadNotificationEmail = () => process.env.LEAD_NOTIFICATION_EMAIL || businessIdentity.primaryEmail

function escapeHtml(value: string | null | undefined) {
  return (value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function shell(title: string, body: string, action?: { label: string; url: string }) {
  const button = action
    ? `<p style="margin:28px 0"><a href="${action.url}" style="background:#d3a23e;color:#080706;padding:13px 20px;text-decoration:none;font-weight:700;border-radius:4px">${action.label}</a></p>`
    : ''
  return `<div style="background:#070909;color:#f5f1e8;font-family:Arial,sans-serif;padding:32px;line-height:1.6"><div style="max-width:620px;margin:auto"><p style="color:#d3a23e;font-weight:700">CAR DEALERSHIP DEMO</p><h1 style="font-family:Georgia,serif;font-weight:500">${title}</h1>${body}${button}<p style="color:#8d8981;font-size:12px;margin-top:32px">Demonstration environment. No physical showroom or real communications.</p></div></div>`
}

/**
 * Phase 0 mail capture: delivery is deliberately disabled, even when a
 * RESEND_API_KEY is accidentally inherited from another project.
 * A separately audited sandbox adapter belongs to P0-05.
 */
export async function sendTransactionalEmail(message: EmailMessage): Promise<EmailResult> {
  if (process.env.EMAIL_DELIVERY_MODE && process.env.EMAIL_DELIVERY_MODE !== 'capture') {
    throw new Error('Outbound email is disabled until the independent Car-Dealership mail sandbox is approved.')
  }
  // Never log customer recipients, raw tokens, HTML or preview URLs.
  console.info('car_dealership_email_captured', { subject: message.subject })
  return { delivered: false, preview: true }
}

export function sendVerificationEmail(to: string, name: string, token: string) {
  const url = `${siteUrl()}/verify-email?token=${encodeURIComponent(token)}`
  return sendTransactionalEmail({
    to,
    subject: 'Verify your Car Dealership Demo account',
    previewUrl: url,
    html: shell('Verify your email', `<p>Hello ${name},</p><p>Confirm your email address to activate your customer account. This link expires in 24 hours.</p>`, { label: 'Verify email', url }),
  })
}

export function sendPasswordResetEmail(to: string, name: string, token: string) {
  const url = `${siteUrl()}/reset-password?token=${encodeURIComponent(token)}`
  return sendTransactionalEmail({
    to,
    subject: 'Reset your Car Dealership Demo password',
    previewUrl: url,
    html: shell('Reset your password', `<p>Hello ${name},</p><p>Use the secure link below to choose a new password. It expires in 30 minutes. Ignore this email if you did not request a reset.</p>`, { label: 'Reset password', url }),
  })
}

export function sendEngagementConfirmation(to: string, name: string, reference: string, kind: 'enquiry' | 'test drive') {
  const url = `${siteUrl()}/account/${kind === 'enquiry' ? 'enquiries' : 'test-drives'}/${reference}`
  return sendTransactionalEmail({
    to,
    subject: `Your Car Dealership Demo ${kind} request ${reference}`,
    previewUrl: url,
    html: shell('Request received', `<p>Hello ${name},</p><p>We received your ${kind} request. Keep this reference for your records: <strong>${reference}</strong>.</p>`, { label: 'Track request', url }),
  })
}

export function sendLeadNotification(kind: 'enquiry' | 'test drive', details: LeadNotificationDetails) {
  const adminPath = kind === 'enquiry' ? '/admin/inquiries' : '/admin/test-drives'
  const adminUrl = `${siteUrl()}${adminPath}`
  const preferredDate = details.preferredDate ? new Date(details.preferredDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : null
  const rows = [
    ['Reference', details.reference],
    ['Customer', details.customerName],
    ['Phone', details.customerPhone],
    ['Email', details.customerEmail],
    ['Vehicle', details.vehicleTitle],
    ['Stock number', details.vehicleStockNumber ?? '—'],
    ...(preferredDate ? [['Preferred date', preferredDate]] : []),
    ...(details.preferredTime ? [['Preferred time', details.preferredTime]] : []),
  ]
    .map(([label, value]) => `<tr><td style="padding:8px 12px;color:#8d8981;vertical-align:top">${escapeHtml(label)}</td><td style="padding:8px 12px;color:#f5f1e8"><strong>${escapeHtml(value)}</strong></td></tr>`)
    .join('')
  const message = details.message?.trim()
    ? `<p style="margin-top:24px;color:#8d8981">Customer message</p><div style="background:#111414;padding:16px;border-radius:4px;white-space:pre-wrap">${escapeHtml(details.message)}</div>`
    : ''

  return sendTransactionalEmail({
    to: leadNotificationEmail(),
    subject: `New ${kind === 'enquiry' ? 'enquiry' : 'test-drive booking'} — ${details.vehicleTitle} — ${details.reference}`,
    previewUrl: adminUrl,
    html: shell(
      kind === 'enquiry' ? 'New vehicle enquiry' : 'New test-drive booking',
      `<p>A new customer lead has been saved in the Car Dealership Demo admin panel.</p><table style="width:100%;border-collapse:collapse;background:#0d1010;border-radius:4px">${rows}</table>${message}`,
      { label: 'Open in admin panel', url: adminUrl },
    ),
  })
}

export function sendStaffInvitationEmail(to: string, token: string, role: string) {
  const url = `${siteUrl()}/staff-invitation?token=${encodeURIComponent(token)}`
  return sendTransactionalEmail({
    to,
    subject: 'Your Car Dealership Demo staff invitation',
    previewUrl: url,
    html: shell('Join the staff workspace', `<p>You have been invited to the Car Dealership Demo staff workspace as <strong>${role.replaceAll('_', ' ')}</strong>.</p><p>This single-use invitation expires in 48 hours.</p>`, { label: 'Accept invitation', url }),
  })
}
