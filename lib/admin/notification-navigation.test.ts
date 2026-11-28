import { UserRole } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import { notificationDestination } from './notification-navigation'

describe('P1-07 notification destination safety', () => {
  it('opens assigned lead details only for authorized staff roles', () => {
    expect(notificationDestination(UserRole.SALES, 'Inquiry', 'clsynthetic001')).toBe('/admin/enquiries/clsynthetic001')
    expect(notificationDestination(UserRole.OPERATIONS, 'TestDrive', 'clsynthetic002')).toBe('/admin/test-drives/clsynthetic002')
    expect(notificationDestination(UserRole.ADMIN, 'SellRequest', 'clsynthetic003')).toBe('/admin/sell-requests/clsynthetic003')
    expect(notificationDestination(UserRole.SUPER_ADMIN, 'ContactMessage', 'clsynthetic004')).toBe('/admin/contact-inquiries/clsynthetic004')
  })

  it('refuses to link customers or roles without resource permission', () => {
    expect(notificationDestination(UserRole.CUSTOMER, 'Inquiry', 'clsynthetic001')).toBeNull()
    expect(notificationDestination(UserRole.CONTENT_MANAGER, 'SellRequest', 'clsynthetic001')).toBeNull()
    expect(notificationDestination(UserRole.SALES, 'Vehicle', 'vehicle001')).toBe('/admin/vehicles/vehicle001')
  })

  it('does not build links from invalid IDs or unknown resource types', () => {
    for (const id of ['../settings', '../../users', '/admin', 'https://evil.test', 'a?x=1', 'a#part', 'a b', '']) {
      expect(notificationDestination(UserRole.ADMIN, 'Inquiry', id)).toBeNull()
    }
    expect(notificationDestination(UserRole.SUPER_ADMIN, 'Unknown', 'resource001')).toBeNull()
    expect(notificationDestination(UserRole.SUPER_ADMIN, 'Inquiry', null)).toBeNull()
    expect(notificationDestination(UserRole.SUPER_ADMIN, null, 'resource001')).toBeNull()
  })
})
