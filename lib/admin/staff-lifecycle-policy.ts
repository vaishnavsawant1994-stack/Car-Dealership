import { UserRole, UserStatus } from '@prisma/client'
import { z } from 'zod'

/** This is not a general customer-account editor: staff roles only. */
export const staffLifecycleSchema = z.object({
  role: z.enum([UserRole.SALES, UserRole.OPERATIONS, UserRole.CONTENT_MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN]).optional(),
  status: z.enum([UserStatus.ACTIVE, UserStatus.SUSPENDED, UserStatus.DISABLED]).optional(),
  version: z.number().int().positive(),
}).strict().refine((value) => value.role !== undefined || value.status !== undefined, {
  message: 'Provide a staff role or account status change.',
})

export function isStaffAccount(value: { role: UserRole; deletedAt?: Date | null }) {
  return value.role !== UserRole.CUSTOMER && !value.deletedAt
}

export function isProtectedSelfChange(
  actorId: string,
  targetId: string,
  currentRole: UserRole,
  next: { role?: UserRole; status?: UserStatus },
  currentStatus: UserStatus,
): boolean {
  if (actorId !== targetId) return false
  // Changing one's own privileges or disabling one's own account is
  // deliberately a separate supervised workflow, even for SUPER_ADMIN.
  return (next.role !== undefined && next.role !== currentRole) ||
    (next.status !== undefined && next.status !== currentStatus)
}

export function shouldRemoveShowroomAssignments(
  next: { role?: UserRole; status?: UserStatus },
  current: { role: UserRole; status: UserStatus },
): boolean {
  const nextRole = next.role ?? current.role
  const nextStatus = next.status ?? current.status
  return nextStatus !== UserStatus.ACTIVE || nextRole === UserRole.SUPER_ADMIN
}

export function canActivateStaff(
  target: { emailVerified: Date | null; passwordHash: string | null; deletedAt: Date | null },
  environment: string,
) {
  // The hosted fictional super-admin must use the controlled P0-06
  // provisioning script rather than a general staff-edit operation.
  if (environment === 'staging' || environment === 'demo' || environment === 'preview') return false
  return Boolean(target.emailVerified && target.passwordHash && !target.deletedAt)
}

export const staffInvitationRevokeSchema = z.object({
  reason: z.string().trim().min(3).max(240).optional(),
}).strict()

export function mayManageInvitationRole(actorRole: UserRole, invitedRole: UserRole): boolean {
  return (invitedRole !== UserRole.ADMIN && invitedRole !== UserRole.SUPER_ADMIN) || actorRole === UserRole.SUPER_ADMIN
}
