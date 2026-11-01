import { UserRole } from '@prisma/client'
import Link from 'next/link'
import { AdminPageHeader } from '@/components/admin/AdminPrimitives'
import { UserManager } from '@/components/admin/UserManager'
import { canManageUser } from '@/lib/auth/admin-resource-policy'
import { hasPermission } from '@/lib/auth/admin-permissions'
import { requirePermission } from '@/lib/auth/require-permission'
import { prisma } from '@/lib/db/prisma'

export default async function Page() {
  const actor = await requirePermission('user.view')
  const users = await prisma.user.findMany({
    where: { deletedAt: null, role: { not: UserRole.CUSTOMER } },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
    take: 200,
    select: {
      id: true, name: true, email: true, role: true, status: true,
      emailVerified: true, lastLoginAt: true, createdAt: true, sessionVersion: true,
      showroomAssignments: { select: { showroom: {
        select: { id: true, name: true, active: true },
      } } },
      _count: { select: { sessions: true } },
    },
  })
  return <>
    <AdminPageHeader
      title="Staff Directory & Account Lifecycle"
      breadcrumb="Management / Staff"
      text="Manage authorized staff roles, status, assigned showrooms and login sessions. Customer accounts and credential hashes are excluded."
      actions={hasPermission(actor.role, 'user.invite') ?
        <Link className="admin-button" href="/admin/users/invite">Staff invitations</Link> : undefined}
    />
    <UserManager users={users.map((user) => {
      const canManage = canManageUser(actor, user)
      return {
        id: user.id, name: user.name, email: user.email,
        role: user.role, status: user.status,
        emailVerified: user.emailVerified?.toISOString() ?? null,
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        createdAt: user.createdAt.toISOString(),
        sessionVersion: user.sessionVersion,
        sessionCount: user._count.sessions,
        showrooms: user.showroomAssignments.map(({ showroom }) => showroom),
        canEdit: hasPermission(actor.role, 'user.update') && canManage && actor.id !== user.id,
        canChangeRole: hasPermission(actor.role, 'user.role.manage') && canManage && actor.id !== user.id,
        canRevokeSessions: hasPermission(actor.role, 'session.revoke') && (canManage || actor.id === user.id),
      }
    })} />
  </>
}
