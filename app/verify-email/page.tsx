import type { Metadata } from 'next'
import { AuthShell } from '@/components/auth/AuthShell'
import { VerifyEmailClient } from '@/components/auth/AuthForms'

export const metadata: Metadata = { title: 'Verify Email | Car Dealership Demo' }

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const query = await searchParams
  return <AuthShell eyebrow="Email verification" title="Activate your account" intro="Verification protects your saved vehicles and customer requests."><VerifyEmailClient token={query.token} /></AuthShell>
}
