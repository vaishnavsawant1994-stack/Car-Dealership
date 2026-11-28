import { UserRole } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import { adminPermissions, hasPermission, isStaffRole, permissionsForRole } from './admin-permissions'

const expectedAllPermissions = [
  'dashboard.view',
  'vehicle.view', 'vehicle.create', 'vehicle.update', 'vehicle.publish', 'vehicle.reserve', 'vehicle.markSold', 'vehicle.archive', 'vehicle.delete',
  'brand.manage', 'bodyType.manage', 'feature.manage',
  'enquiry.view', 'enquiry.assign', 'enquiry.update', 'enquiry.close',
  'testDrive.view', 'testDrive.assign', 'testDrive.confirm', 'testDrive.reschedule', 'testDrive.complete', 'testDrive.cancel',
  'sellRequest.view', 'sellRequest.assign', 'sellRequest.inspect', 'sellRequest.value', 'sellRequest.offer', 'sellRequest.complete',
  'contactInquiry.view', 'contactInquiry.assign', 'contactInquiry.update', 'contactInquiry.close',
  'finance.view', 'finance.update',
  'testimonial.manage', 'gallery.manage', 'content.manage', 'newsletter.view', 'newsletter.export',
  'showroom.manage', 'user.view', 'user.invite', 'user.update', 'user.disable', 'user.role.manage', 'session.revoke',
  'settings.view', 'settings.update', 'auditLog.view', 'notification.view', 'export.create', 'emailCapture.view',
]

const expectedPermissions: Record<UserRole, readonly string[]> = {
  [UserRole.CUSTOMER]: [],
  [UserRole.SALES]: [
    'dashboard.view', 'vehicle.view', 'enquiry.view', 'enquiry.assign', 'enquiry.update', 'enquiry.close',
    'testDrive.view', 'testDrive.assign', 'testDrive.confirm', 'testDrive.reschedule', 'testDrive.complete', 'testDrive.cancel',
    'sellRequest.view', 'contactInquiry.view', 'contactInquiry.assign', 'contactInquiry.update', 'contactInquiry.close', 'notification.view',
  ],
  [UserRole.FINANCE]: ['dashboard.view', 'finance.view', 'finance.update', 'auditLog.view', 'notification.view'],
  [UserRole.OPERATIONS]: [
    'dashboard.view', 'vehicle.view', 'vehicle.create', 'vehicle.update', 'vehicle.reserve', 'vehicle.markSold', 'vehicle.archive',
    'brand.manage', 'bodyType.manage', 'feature.manage', 'testDrive.view', 'testDrive.assign', 'testDrive.confirm',
    'testDrive.reschedule', 'testDrive.complete', 'testDrive.cancel', 'sellRequest.view', 'sellRequest.assign', 'sellRequest.inspect',
    'sellRequest.value', 'sellRequest.offer', 'sellRequest.complete', 'contactInquiry.view', 'notification.view', 'export.create',
  ],
  [UserRole.CONTENT_MANAGER]: [
    'dashboard.view', 'vehicle.view', 'testimonial.manage', 'gallery.manage', 'content.manage', 'newsletter.view',
    'newsletter.export', 'settings.view', 'notification.view',
  ],
  [UserRole.ADMIN]: expectedAllPermissions.filter((permission) => !['vehicle.delete', 'user.role.manage', 'emailCapture.view'].includes(permission)),
  [UserRole.SUPER_ADMIN]: expectedAllPermissions,
}

describe('admin permission matrix contract', () => {
  it('contains only the explicitly approved permission identifiers', () => {
    expect([...adminPermissions].sort()).toEqual([...expectedAllPermissions].sort())
  })

  it.each(Object.values(UserRole))('%s receives exactly its approved permissions', (role) => {
    const actual = permissionsForRole(role).slice().sort()
    expect(actual).toEqual([...expectedPermissions[role]].sort())

    for (const permission of adminPermissions) {
      expect(hasPermission(role, permission)).toBe(expectedPermissions[role].includes(permission))
    }
  })

  it('grants admin access only to staff roles', () => {
    for (const role of Object.values(UserRole)) {
      expect(isStaffRole(role)).toBe(role !== UserRole.CUSTOMER)
    }
  })
})
