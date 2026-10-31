import type { Metadata } from 'next'
import { AuthShell } from '@/components/auth/AuthShell'
import { ForgotPasswordForm } from '@/components/auth/AuthForms'

export const metadata: Metadata = { title: 'Forgot Password | Car Dealership Demo' }

export default function ForgotPasswordPage() {
  return <AuthShell eyebrow="Account recovery" title="Reset your password" intro="Enter your account email. We will send a short-lived secure reset link if it matches an active account."><ForgotPasswordForm /></AuthShell>
}
