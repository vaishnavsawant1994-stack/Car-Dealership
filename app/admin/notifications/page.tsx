import { AdminEmpty, AdminPageHeader } from '@/components/admin/AdminPrimitives'
import { NotificationList } from '@/components/admin/NotificationList'
import { notificationDestination } from '@/lib/admin/notification-navigation'
import { requirePermission } from '@/lib/auth/require-permission'
import { prisma } from '@/lib/db/prisma'

export default async function Page() {
  const actor = await requirePermission('notification.view')
  const items = await prisma.adminNotification.findMany({
    where: { userId: actor.id },
    take: 100,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  })
  const safeItems = items.map((item) => ({
    id: item.id,
    title: item.title,
    message: item.message,
    readAt: item.readAt?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
    href: notificationDestination(actor.role, item.resourceType, item.resourceId),
  }))

  return <>
    <AdminPageHeader title="Notifications" text="Operational alerts and action items for your account. Only your own notifications appear here." breadcrumb="Notifications" />
    {safeItems.length
      ? <NotificationList items={safeItems} />
      : <AdminEmpty title="No notifications" text="New operational alerts will appear here." />}
  </>
}
