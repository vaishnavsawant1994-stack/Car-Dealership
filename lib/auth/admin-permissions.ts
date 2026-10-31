import { UserRole } from '@prisma/client'

export const adminPermissions = [
  'dashboard.view',
  'vehicle.view', 'vehicle.create', 'vehicle.update', 'vehicle.publish', 'vehicle.reserve', 'vehicle.markSold', 'vehicle.archive', 'vehicle.delete',
  'brand.manage', 'bodyType.manage', 'feature.manage',
  'enquiry.view', 'enquiry.assign', 'enquiry.update', 'enquiry.close',
  'testDrive.view', 'testDrive.assign', 'testDrive.confirm', 'testDrive.reschedule', 'testDrive.complete', 'testDrive.cancel',
  'sellRequest.view', 'sellRequest.assign', 'sellRequest.inspect', 'sellRequest.value', 'sellRequest.offer', 'sellRequest.complete',
  'contactInquiry.view', 'contactInquiry.assign', 'contactInquiry.update', 'contactInquiry.close',
  'testimonial.manage', 'gallery.manage', 'content.manage', 'newsletter.view', 'newsletter.export',
  'showroom.manage', 'user.view', 'user.invite', 'user.update', 'user.disable', 'user.role.manage', 'session.revoke',
  'settings.view', 'settings.update', 'auditLog.view', 'notification.view', 'export.create', 'emailCapture.view',
] as const

export type AdminPermission = (typeof adminPermissions)[number]

const sales: AdminPermission[] = [
  'dashboard.view', 'vehicle.view',
  'enquiry.view', 'enquiry.assign', 'enquiry.update', 'enquiry.close',
  'testDrive.view', 'testDrive.assign', 'testDrive.confirm', 'testDrive.reschedule', 'testDrive.complete', 'testDrive.cancel',
  'sellRequest.view', 'contactInquiry.view', 'contactInquiry.assign', 'contactInquiry.update', 'contactInquiry.close',
  'notification.view',
]

const operations: AdminPermission[] = [
  'dashboard.view', 'vehicle.view', 'vehicle.create', 'vehicle.update', 'vehicle.reserve', 'vehicle.markSold', 'vehicle.archive',
  'brand.manage', 'bodyType.manage', 'feature.manage',
  'testDrive.view', 'testDrive.assign', 'testDrive.confirm', 'testDrive.reschedule', 'testDrive.complete', 'testDrive.cancel',
  'sellRequest.view', 'sellRequest.assign', 'sellRequest.inspect', 'sellRequest.value', 'sellRequest.offer', 'sellRequest.complete',
  'contactInquiry.view', 'notification.view', 'export.create',
]

const content: AdminPermission[] = [
  'dashboard.view', 'vehicle.view', 'testimonial.manage', 'gallery.manage', 'content.manage',
  'newsletter.view', 'newsletter.export', 'settings.view', 'notification.view',
]

const admin: AdminPermission[] = adminPermissions.filter((permission) => !['vehicle.delete', 'user.role.manage', 'emailCapture.view'].includes(permission))

const matrix: Record<UserRole, ReadonlySet<AdminPermission>> = {
  [UserRole.CUSTOMER]: new Set(),
  [UserRole.SALES]: new Set(sales),
  [UserRole.OPERATIONS]: new Set(operations),
  [UserRole.CONTENT_MANAGER]: new Set(content),
  [UserRole.ADMIN]: new Set(admin),
  [UserRole.SUPER_ADMIN]: new Set(adminPermissions),
}

export function isStaffRole(role: UserRole): boolean {
  return role !== UserRole.CUSTOMER
}

export function hasPermission(role: UserRole, permission: AdminPermission): boolean {
  return matrix[role].has(permission)
}

export function permissionsForRole(role: UserRole): AdminPermission[] {
  return adminPermissions.filter((permission) => matrix[role].has(permission))
}

export const rolePermissionMatrix = matrix
