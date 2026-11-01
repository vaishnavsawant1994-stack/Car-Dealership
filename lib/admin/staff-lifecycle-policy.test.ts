import { describe, expect, it } from 'vitest'
import { UserRole, UserStatus } from '@prisma/client'
import {
  canActivateStaff, isProtectedSelfChange, isStaffAccount,
  mayManageInvitationRole, shouldRemoveShowroomAssignments,
  staffInvitationRevokeSchema, staffLifecycleSchema,
} from './staff-lifecycle-policy'

describe('P1-04 staff lifecycle safety policy', () => {
  it('rejects unknown fields, invalid revisions, customer roles and no-op input', () => {
    expect(staffLifecycleSchema.safeParse({ status: 'DISABLED', version: 1 }).success).toBe(true)
    expect(staffLifecycleSchema.safeParse({ role: 'SALES', version: 1 }).success).toBe(true)
    expect(staffLifecycleSchema.safeParse({ version: 1 }).success).toBe(false)
    expect(staffLifecycleSchema.safeParse({ role: 'CUSTOMER', version: 1 }).success).toBe(false)
    expect(staffLifecycleSchema.safeParse({ role: 'ADMIN', version: 0 }).success).toBe(false)
    expect(staffLifecycleSchema.safeParse({ status: 'ACTIVE', version: 1, isSuperAdmin: true }).success).toBe(false)
  })
  it('never edits customer identities or deleted staff via staff management', () => {
    expect(isStaffAccount({ role: UserRole.SALES })).toBe(true)
    expect(isStaffAccount({ role: UserRole.CUSTOMER })).toBe(false)
    expect(isStaffAccount({ role: UserRole.ADMIN, deletedAt: new Date() })).toBe(false)
  })
  it('prohibits all self-demotion or self-disable actions', () => {
    expect(isProtectedSelfChange('same', 'same', UserRole.SUPER_ADMIN,
      { status: UserStatus.DISABLED }, UserStatus.ACTIVE)).toBe(true)
    expect(isProtectedSelfChange('same', 'same', UserRole.ADMIN,
      { role: UserRole.SALES }, UserStatus.ACTIVE)).toBe(true)
    expect(isProtectedSelfChange('other', 'same', UserRole.ADMIN,
      { role: UserRole.SALES }, UserStatus.ACTIVE)).toBe(false)
    expect(isProtectedSelfChange('same', 'same', UserRole.ADMIN,
      { status: UserStatus.ACTIVE }, UserStatus.ACTIVE)).toBe(false)
  })
  it('removes operational branch assignments on suspension, disablement or global promotion', () => {
    const current = { role: UserRole.SALES, status: UserStatus.ACTIVE }
    expect(shouldRemoveShowroomAssignments({ status: UserStatus.DISABLED }, current)).toBe(true)
    expect(shouldRemoveShowroomAssignments({ status: UserStatus.SUSPENDED }, current)).toBe(true)
    expect(shouldRemoveShowroomAssignments({ role: UserRole.SUPER_ADMIN }, current)).toBe(true)
    expect(shouldRemoveShowroomAssignments({ role: UserRole.OPERATIONS }, current)).toBe(false)
  })
  it('keeps hosted reactivation tied to the one-time approved provisioning procedure', () => {
    const valid = { emailVerified: new Date(), passwordHash: '$argon2id$fake-for-unit', deletedAt: null }
    expect(canActivateStaff(valid, 'test')).toBe(true)
    expect(canActivateStaff(valid, 'staging')).toBe(false)
    expect(canActivateStaff(valid, 'demo')).toBe(false)
    expect(canActivateStaff(valid, 'preview')).toBe(false)
    expect(canActivateStaff({ ...valid, emailVerified: null }, 'test')).toBe(false)
    expect(canActivateStaff({ ...valid, passwordHash: null }, 'test')).toBe(false)
  })
  it('restricts privileged ADMIN invitations and validates reason format', () => {
    expect(mayManageInvitationRole(UserRole.ADMIN, UserRole.ADMIN)).toBe(false)
    expect(mayManageInvitationRole(UserRole.SUPER_ADMIN, UserRole.ADMIN)).toBe(true)
    expect(mayManageInvitationRole(UserRole.ADMIN, UserRole.SUPER_ADMIN)).toBe(false)
    expect(mayManageInvitationRole(UserRole.SUPER_ADMIN, UserRole.SUPER_ADMIN)).toBe(true)
    expect(mayManageInvitationRole(UserRole.ADMIN, UserRole.SALES)).toBe(true)
    expect(staffInvitationRevokeSchema.safeParse({}).success).toBe(true)
    expect(staffInvitationRevokeSchema.safeParse({ reason: 'Cancelled by owner' }).success).toBe(true)
    expect(staffInvitationRevokeSchema.safeParse({ reason: 'x' }).success).toBe(false)
  })
})
