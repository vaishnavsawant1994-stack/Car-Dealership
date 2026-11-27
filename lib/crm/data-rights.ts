import { CustomerDataRightsKind } from '@prisma/client'
import { z } from 'zod'

export const dataRightsRequestSchema = z.object({
  kind: z.enum(CustomerDataRightsKind),
}).strict()

/** Logging a request never verifies identity, exports data, or erases records. */
export const customerPrivacyIntakeKinds = [
  CustomerDataRightsKind.ACCESS,
  CustomerDataRightsKind.RECTIFICATION,
  CustomerDataRightsKind.ERASURE,
] as const
