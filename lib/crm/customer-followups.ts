import { z } from 'zod'

export const createCustomerFollowUpSchema = z.object({
  title: z.string().trim().min(5).max(180),
  dueAt: z.string().datetime({ offset: true }),
  assignedToId: z.string().cuid().optional(),
}).strict()

export type CreateCustomerFollowUpInput = z.output<typeof createCustomerFollowUpSchema>

export function checkDueDate(dueAt: Date, now = new Date()) {
  const oneYear = 366 * 24 * 60 * 60 * 1000
  return !Number.isNaN(dueAt.valueOf()) && dueAt.getTime() > now.getTime() &&
    dueAt.getTime() <= now.getTime() + oneYear
}

/** No external notification or customer message is implied by a follow-up record. */
export const customerFollowUpType = 'Customer'
