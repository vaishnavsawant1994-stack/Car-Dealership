import { describe, expect, it } from 'vitest'
import { checkDueDate, createCustomerFollowUpSchema, customerFollowUpType } from './customer-followups'

describe('P4-02 private customer follow-up input policy', () => {
  it('does not permit unknown fields or unbounded task contents', () => {
    const input = { title: 'Call fictional customer', dueAt: '2026-12-20T10:00:00+05:30' }
    expect(createCustomerFollowUpSchema.safeParse(input).success).toBe(true)
    expect(createCustomerFollowUpSchema.safeParse({ ...input, emailRecipient: 'external@example.com' }).success).toBe(false)
    expect(createCustomerFollowUpSchema.safeParse({ ...input, title: 'x'.repeat(500) }).success).toBe(false)
    expect(createCustomerFollowUpSchema.safeParse({ ...input, title: 'a' }).success).toBe(false)
    expect(createCustomerFollowUpSchema.safeParse({ ...input, dueAt: '2026-12-20' }).success).toBe(false)
    expect(customerFollowUpType).toBe('Customer')
  })
  it('requires a future task within the next year', () => {
    const now = new Date('2026-11-27T00:00:00Z')
    expect(checkDueDate(new Date('2026-11-28T00:00:00Z'), now)).toBe(true)
    expect(checkDueDate(new Date('2026-11-25T00:00:00Z'), now)).toBe(false)
    expect(checkDueDate(new Date('2028-01-01T00:00:00Z'), now)).toBe(false)
    expect(checkDueDate(new Date('invalid'), now)).toBe(false)
  })
})
