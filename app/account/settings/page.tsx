import { AccountHeading } from '@/components/account/AccountPrimitives'
import { NotificationSettingsForm } from '@/components/account/AccountForms'
import { requireAuthenticatedUser } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'
import { redirect } from 'next/navigation'
import { UserRole } from '@prisma/client'

export default async function SettingsPage() {
  const user = await requireAuthenticatedUser('/account/settings')
  if (user.role !== UserRole.CUSTOMER) redirect('/admin')
  const settings = await prisma.customerNotificationSettings.findUnique({ where: { userId: user.id } })
  return <><AccountHeading eyebrow="Communication control" title="Notifications" text="Choose account updates and store separate email and WhatsApp marketing choices. Campaign delivery remains disabled." /><NotificationSettingsForm initial={{ enquiryUpdates: settings?.enquiryUpdates ?? true, testDriveReminders: settings?.testDriveReminders ?? true, priceChangeAlerts: settings?.priceChangeAlerts ?? true, soldVehicleAlerts: settings?.soldVehicleAlerts ?? true, marketingEmails: settings?.marketingEmails ?? false, whatsAppUpdates: settings?.whatsAppUpdates ?? false }} /></>
}
