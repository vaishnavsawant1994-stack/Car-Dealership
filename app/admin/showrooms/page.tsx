import { AdminPageHeader } from '@/components/admin/AdminPrimitives'
import { ShowroomManager } from '@/components/admin/ShowroomManager'
import { requirePermission } from '@/lib/auth/require-permission'
import { prisma } from '@/lib/db/prisma'

export default async function Page() {
  await requirePermission('showroom.manage')
  const items = await prisma.showroom.findMany({
    orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
    include: { _count: { select: { staffAssignments: true } } },
  })
  return <>
    <AdminPageHeader title="Branch & Showroom Management"
      text="Manage locations, select one active primary showroom and assign eligible staff. Locations remain separate from the business profile."
      breadcrumb="Management / Showrooms" />
    <ShowroomManager items={items.map((item) => ({
      ...item, latitude: item.latitude?.toString() ?? null,
      longitude: item.longitude?.toString() ?? null,
    }))} />
  </>
}
