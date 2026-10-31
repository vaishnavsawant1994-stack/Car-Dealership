import type { Metadata } from 'next'
import { AuthShell } from '@/components/auth/AuthShell'
import { ResetPasswordForm } from '@/components/auth/AuthForms'

export const metadata: Metadata = { title: 'Reset Password | Car Dealership Demo' }

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const query = await searchParams
  return <AuthShell eyebrow="Secure reset" title="Choose a new password" intro="Your new password will sign out any other active sessions on this account."><ResetPasswordForm token={query.token} /></AuthShell>
}
