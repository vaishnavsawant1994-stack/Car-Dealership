import { AuthShell } from '@/components/auth/AuthShell'
import { StaffInvitationForm } from '@/components/auth/StaffInvitationForm'
export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) { const { token } = await searchParams; return <AuthShell eyebrow="Staff operations" title="Accept your invitation" intro="Create your secure Car Dealership Demo staff credentials.">{token ? <StaffInvitationForm token={token} /> : <p className="auth-message">This invitation link is incomplete or expired.</p>}</AuthShell> }
