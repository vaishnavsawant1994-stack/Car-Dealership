import { AdminPageHeader } from '@/components/admin/AdminPrimitives'
import { ShowroomManager } from '@/components/admin/ShowroomManager'
import { requirePermission } from '@/lib/auth/require-permission'
import { prisma } from '@/lib/db/prisma'
import { notFound } from 'next/navigation'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission('showroom.manage')
  const { id } = await params
  const items = await prisma.showroom.findMany({
    orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
    include: { _count: { select: { staffAssignments: true } } },
  })
  if (!items.some((item) => item.id === id)) notFound()
  return <>
    <AdminPageHeader title="Edit Showroom" breadcrumb="Management / Showrooms / Edit" />
    <ShowroomManager initialId={id} items={items.map((item) => ({
      ...item, latitude: item.latitude?.toString() ?? null,
      longitude: item.longitude?.toString() ?? null,
    }))} />
  </>
}
