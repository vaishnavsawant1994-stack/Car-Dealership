import { UserRole, UserStatus } from '@prisma/client'
import { z } from 'zod'
import { isDemoEmail, isHostedDemoEnvironment } from '@/lib/security/demo-access'

/** Showroom is the canonical branch: no separate Branch table. */
export const staffAssignmentSchema = z.object({
  userId: z.string().min(1).max(100),
}).strict()

export const showroomEditSchema = z.object({
  version: z.number().int().positive(),
})

export function eligibleShowroomStaff(user: {
  role: UserRole
  status: UserStatus
  deletedAt?: Date | null
}): boolean {
  return user.role !== UserRole.CUSTOMER &&
    user.role !== UserRole.SUPER_ADMIN &&
    user.status === UserStatus.ACTIVE && !user.deletedAt
}

/** No external communication links or real identities in hosted demos. */
export function validateHostedShowroom(input: {
  name: string; email: string; phone: string; whatsapp?: string | null; mapUrl?: string | null;
}, environment?: string): string | null {
  if (!isHostedDemoEnvironment(environment)) return null
  if (!/demo|demonstration|fictional/i.test(input.name)) return 'Hosted branches must have an explicitly fictional name.'
  if (!isDemoEmail(input.email)) return 'Hosted branches must use a reserved car-dealership.test email.'
  if (!['Demo enquiries only', 'Not available in demo'].includes(input.phone)) {
    return 'Hosted branches cannot publish real phone numbers.'
  }
  if (input.whatsapp || input.mapUrl) return 'External WhatsApp and map URLs are disabled in hosted demos.'
  return null
}
