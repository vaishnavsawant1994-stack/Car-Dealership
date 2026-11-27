import { UserRole } from '@prisma/client'
import {
  adminPermissions, hasPermission, permissionsForRole,
  type AdminPermission,
} from '@/lib/auth/admin-permissions'

export const managedRoles = [
  UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.OPERATIONS,
  UserRole.SALES, UserRole.CONTENT_MANAGER, UserRole.CUSTOMER,
] as const

const descriptions: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: 'System owner: all administrator permissions.',
  [UserRole.ADMIN]: 'Dealership administrator: routine staff and business operations, excluding owner-only actions.',
  [UserRole.OPERATIONS]: 'Vehicle, inspection, procurement and operational coordination.',
  [UserRole.SALES]: 'Sales enquiries, test-drive coordination and customer communications.',
  [UserRole.CONTENT_MANAGER]: 'Website content and approved public configuration management.',
  [UserRole.CUSTOMER]: 'Public customer account; no staff/admin permissions.',
}

export function groupedPermissionMatrix() {
  const categories = new Map<string, Array<{ permission: AdminPermission; grants: Record<UserRole, boolean> }>>()
  for (const permission of adminPermissions) {
    const category = permission.split('.')[0]
    const current = categories.get(category) ?? []
    current.push({
      permission,
      grants: Object.fromEntries(managedRoles.map((role) => [role, hasPermission(role, permission)])) as Record<UserRole, boolean>,
    })
    categories.set(category, current)
  }
  return Array.from(categories, ([category, items]) => ({ category, items }))
}

export function effectiveRoleMatrix() {
  return managedRoles.map((role) => ({
    role, description: descriptions[role],
    permissions: permissionsForRole(role),
    total: permissionsForRole(role).length,
  }))
}

export function canManagePrivilegedRoles(actor: UserRole) {
  return hasPermission(actor, 'user.role.manage')
}
