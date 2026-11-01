import { describe, expect, it } from 'vitest'
import { UserRole, UserStatus } from '@prisma/client'
import { hasPermission } from '@/lib/auth/admin-permissions'
import { eligibleShowroomStaff, staffAssignmentSchema, validateHostedShowroom } from './showroom-policy'

describe('P1-03 branch ownership and assignment policy', () => {
  it('accepts only approved active staff for assignment', () => {
    expect(eligibleShowroomStaff({ role: UserRole.SALES, status: UserStatus.ACTIVE })).toBe(true)
    expect(eligibleShowroomStaff({ role: UserRole.OPERATIONS, status: UserStatus.ACTIVE })).toBe(true)
    expect(eligibleShowroomStaff({ role: UserRole.ADMIN, status: UserStatus.ACTIVE })).toBe(true)
    expect(eligibleShowroomStaff({ role: UserRole.CUSTOMER, status: UserStatus.ACTIVE })).toBe(false)
    expect(eligibleShowroomStaff({ role: UserRole.SUPER_ADMIN, status: UserStatus.ACTIVE })).toBe(false)
    expect(eligibleShowroomStaff({ role: UserRole.SALES, status: UserStatus.DISABLED })).toBe(false)
    expect(eligibleShowroomStaff({ role: UserRole.SALES, status: UserStatus.ACTIVE, deletedAt: new Date() })).toBe(false)
  })
  it('rejects broad or malformed staff assignment inputs', () => {
    expect(staffAssignmentSchema.safeParse({ userId: 'staff-123' }).success).toBe(true)
    expect(staffAssignmentSchema.safeParse({ userId: '' }).success).toBe(false)
    expect(staffAssignmentSchema.safeParse({ userId: 'id', role: 'SUPER_ADMIN' }).success).toBe(false)
  })
  it('restricts branch management to existing admin roles', () => {
    expect(hasPermission(UserRole.ADMIN, 'showroom.manage')).toBe(true)
    expect(hasPermission(UserRole.SUPER_ADMIN, 'showroom.manage')).toBe(true)
    expect(hasPermission(UserRole.SALES, 'showroom.manage')).toBe(false)
    expect(hasPermission(UserRole.CUSTOMER, 'showroom.manage')).toBe(false)
  })
  it('keeps hosted demo branch identities and contacts fictional', () => {
    const allowed = { name: 'Demo Showroom South', email: 'demo.sales@car-dealership.test',
      phone: 'Demo enquiries only', whatsapp: '', mapUrl: '' }
    expect(validateHostedShowroom(allowed, 'staging')).toBeNull()
    expect(validateHostedShowroom(allowed, 'demo')).toBeNull()
    expect(validateHostedShowroom({ ...allowed, name: 'Real Client Store' }, 'demo')).not.toBeNull()
    expect(validateHostedShowroom({ ...allowed, email: 'sales@realclient.com' }, 'staging')).not.toBeNull()
    expect(validateHostedShowroom({ ...allowed, phone: '+491234567890' }, 'preview')).not.toBeNull()
    expect(validateHostedShowroom({ ...allowed, whatsapp: '+491234567890' }, 'staging')).not.toBeNull()
    expect(validateHostedShowroom({ ...allowed, mapUrl: 'https://maps.google.com/' }, 'staging')).not.toBeNull()
    expect(validateHostedShowroom({ ...allowed, name: 'Real Client Store' }, 'test')).toBeNull()
  })
})
