import { CustomerDataRightsKind } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import { customerPrivacyIntakeKinds, dataRightsRequestSchema } from './data-rights'

describe('P4-04 customer privacy request intake', () => {
  it('lists every currently supported request type without a destructive action', () => {
    expect(customerPrivacyIntakeKinds).toEqual([
      CustomerDataRightsKind.ACCESS, CustomerDataRightsKind.RECTIFICATION, CustomerDataRightsKind.ERASURE,
    ])
  })
  it('rejects arbitrary fields, fake identity verification and request status overrides', () => {
    expect(dataRightsRequestSchema.safeParse({ kind: 'ERASURE' }).success).toBe(true)
    expect(dataRightsRequestSchema.safeParse({ kind: 'ACCESS' }).success).toBe(true)
    expect(dataRightsRequestSchema.safeParse({ kind: 'DELETE_NOW' }).success).toBe(false)
    expect(dataRightsRequestSchema.safeParse({ kind: 'ERASURE', verified: true }).success).toBe(false)
    expect(dataRightsRequestSchema.safeParse({ kind: 'ACCESS', status: 'RESOLVED' }).success).toBe(false)
    expect(dataRightsRequestSchema.safeParse({ kind: 'ACCESS', email: 'someone@example.com' }).success).toBe(false)
  })
})
