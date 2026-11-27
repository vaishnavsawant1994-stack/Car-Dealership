import { UserRole } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import { adminPermissions, hasPermission } from '@/lib/auth/admin-permissions'
import { canManagePrivilegedRoles, effectiveRoleMatrix, groupedPermissionMatrix, managedRoles } from './role-matrix'

describe('P1-05 effective staff role permissions', () => {
  it('shows every backend-defined permission exactly once, without a second editable permission store', () => {
    const grouped = groupedPermissionMatrix()
    const permissions = grouped.flatMap((category) => category.items.map((item) => item.permission))
    expect(permissions).toEqual(adminPermissions)
    expect(new Set(permissions).size).toBe(adminPermissions.length)
    expect(grouped.every((category) => category.items.length > 0)).toBe(true)
  })
  it('reflects the canonical policy for every role and capability', () => {
    const grouped = groupedPermissionMatrix()
    for (const role of managedRoles) for (const group of grouped) for (const item of group.items) {
      expect(item.grants[role]).toBe(hasPermission(role, item.permission))
    }
    const summary = effectiveRoleMatrix()
    expect(summary).toHaveLength(Object.values(UserRole).length)
    expect(summary.every((role) => role.total === role.permissions.length)).toBe(true)
  })
  it('prevents self-approval and privileged access by ordinary admins and customer roles', () => {
    expect(canManagePrivilegedRoles(UserRole.SUPER_ADMIN)).toBe(true)
    for (const role of [UserRole.ADMIN, UserRole.SALES, UserRole.FINANCE, UserRole.WORKSHOP, UserRole.PARTS_MANAGER, UserRole.OPERATIONS, UserRole.CONTENT_MANAGER, UserRole.CUSTOMER]) {
      expect(canManagePrivilegedRoles(role)).toBe(false)
    }
    expect(hasPermission(UserRole.CUSTOMER, 'user.view')).toBe(false)
    expect(hasPermission(UserRole.CONTENT_MANAGER, 'user.role.manage')).toBe(false)
    expect(hasPermission(UserRole.ADMIN, 'emailCapture.view')).toBe(false)
    expect(hasPermission(UserRole.SUPER_ADMIN, 'emailCapture.view')).toBe(true)
  })
})
