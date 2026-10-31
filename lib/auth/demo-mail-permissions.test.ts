import { describe, expect, it } from 'vitest'
import { UserRole } from '@prisma/client'
import { hasPermission } from './admin-permissions'

describe('demo mailbox authorisation', () => {
  it('allows only the super administrator to read captured email action tokens', () => {
    expect(hasPermission(UserRole.SUPER_ADMIN, 'emailCapture.view')).toBe(true)
    for (const role of [UserRole.ADMIN, UserRole.SALES, UserRole.OPERATIONS, UserRole.CONTENT_MANAGER, UserRole.CUSTOMER]) {
      expect(hasPermission(role, 'emailCapture.view')).toBe(false)
    }
  })
})
