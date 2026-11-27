import { UserRole } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import { canExportResource, exportResources } from './admin-export-policy'

describe('resource export authorization', () => {
  it('requires both the export operation and resource view permission', () => {
    for (const resource of exportResources) {
      expect(canExportResource(UserRole.SUPER_ADMIN, resource)).toBe(true)
      expect(canExportResource(UserRole.ADMIN, resource)).toBe(true)
    }
  })

  it('does not let Operations export enquiries without enquiry.view', () => {
    expect(canExportResource(UserRole.OPERATIONS, 'enquiries')).toBe(false)
    expect(canExportResource(UserRole.OPERATIONS, 'vehicles')).toBe(true)
    expect(canExportResource(UserRole.OPERATIONS, 'test-drives')).toBe(true)
    expect(canExportResource(UserRole.OPERATIONS, 'sell-requests')).toBe(true)
    expect(canExportResource(UserRole.OPERATIONS, 'contact-inquiries')).toBe(true)
    expect(canExportResource(UserRole.OPERATIONS, 'newsletter')).toBe(false)
  })

  it('limits Content Manager exports to its newsletter permission pair', () => {
    expect(canExportResource(UserRole.CONTENT_MANAGER, 'newsletter')).toBe(true)
    expect(canExportResource(UserRole.CONTENT_MANAGER, 'vehicles')).toBe(false)
  })

  it('denies exports to roles without the required resource access', () => {
    for (const resource of exportResources) {
      expect(canExportResource(UserRole.SALES, resource)).toBe(false)
      expect(canExportResource(UserRole.CUSTOMER, resource)).toBe(false)
    }
  })
})
