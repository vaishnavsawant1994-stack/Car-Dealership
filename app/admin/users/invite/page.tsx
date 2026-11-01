import { AdminPageHeader } from '@/components/admin/AdminPrimitives'
import { StaffInvitationsPanel } from '@/components/admin/StaffInvitationsPanel'
import { listStaffInvitations } from '@/lib/admin/staff-lifecycle-service'
import { hasPermission } from '@/lib/auth/admin-permissions'
import { requirePermission } from '@/lib/auth/require-permission'
import { isHostedDemoEnvironment } from '@/lib/security/demo-access'

export default async function Page() {
  const actor = await requirePermission('user.invite')
  const invitations = await listStaffInvitations(actor.role)
  return <>
    <AdminPageHeader
      title="Staff Invitations"
      text="Review single-use staff invitations and revoke unused links. Protected demos do not permit new invitations."
      breadcrumb="Management / Staff / Invitations"
    />
    <StaffInvitationsPanel
      invitations={invitations.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
        expiresAt: item.expiresAt.toISOString(),
        usedAt: item.usedAt?.toISOString() ?? null,
        revokedAt: item.revokedAt?.toISOString() ?? null,
      }))}
      canInviteAdmin={hasPermission(actor.role, 'user.role.manage')}
      hostedDemo={isHostedDemoEnvironment()}
    />
  </>
}
