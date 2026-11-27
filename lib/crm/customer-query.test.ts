import { UserRole, UserStatus } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import { customerListSelect, customerProfileSelect, customerWhere, parseCustomerFilters } from './customer-query'

describe('P4-01 customer 360 privacy and search policy', () => {
  it('bounds pagination, search text and allowed account statuses', () => {
    expect(parseCustomerFilters({ page: '2', search: ' Example ', status: 'ACTIVE' })).toEqual({
      page: 2, search: 'Example', status: UserStatus.ACTIVE,
    })
    expect(parseCustomerFilters({ page: '-10', status: 'DELETED' }).page).toBe(1)
    expect(parseCustomerFilters({ page: '2000' }).page).toBe(1000)
    expect(parseCustomerFilters({ search: 'a'.repeat(1000) }).search).toHaveLength(120)
  })
  it('always filters to registered nondeleted customer accounts, not staff', () => {
    const where = customerWhere(parseCustomerFilters({ search: 'fictional', status: 'ACTIVE' }))
    expect(where.role).toBe(UserRole.CUSTOMER)
    expect(where.deletedAt).toBeNull()
    expect(where.status).toBe(UserStatus.ACTIVE)
    expect(where.OR).toHaveLength(3)
  })
  it('excludes all authentication, administrative and private relationship fields', () => {
    const forbidden = [
      'passwordHash', 'sessions', 'accounts', 'emailVerificationTokens', 'passwordResetTokens',
      'auditLogs', 'adminNotifications', 'assignedInquiries', 'assignedSellRequests',
      'sessionVersion', 'deletedAt', 'staffInvitation', 'adminPreferences',
    ]
    for (const key of forbidden) {
      expect(Object.hasOwn(customerListSelect, key)).toBe(false)
      expect(Object.hasOwn(customerProfileSelect, key)).toBe(false)
    }
    expect(customerProfileSelect.notificationSettings.select).toEqual({
      marketingEmails: true, marketingConsentedAt: true, whatsAppUpdates: true, whatsAppConsentedAt: true,
    })
  })
})
