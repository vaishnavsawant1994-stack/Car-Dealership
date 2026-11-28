import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthenticatedUser } from '@/lib/auth/session'
import { updateCustomerNotificationSettings } from '@/lib/crm/customer-settings-service'

const schema = z.object({
  enquiryUpdates: z.boolean(), testDriveReminders: z.boolean(), priceChangeAlerts: z.boolean(), soldVehicleAlerts: z.boolean(), marketingEmails: z.boolean(), whatsAppUpdates: z.boolean(),
})

export async function PATCH(request: Request) {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Sign in again to update preferences.' } }, { status: 401 })
  const input = schema.safeParse(await request.json().catch(() => null))
  if (!input.success) return NextResponse.json({ error: { code: 'INVALID_REQUEST', message: 'Notification settings are invalid.' } }, { status: 400 })
  const result = await updateCustomerNotificationSettings(user.id, input.data)
  if (result.type === 'not-customer') return NextResponse.json({ error: { code: 'CUSTOMER_ACCOUNT_REQUIRED' } }, { status: 403 })
  return NextResponse.json({ data: result.data, message: 'Notification preferences updated.' })
}
