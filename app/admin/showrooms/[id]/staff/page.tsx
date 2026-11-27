import { notFound } from 'next/navigation'
import { AdminPageHeader } from '@/components/admin/AdminPrimitives'
import { ShowroomStaffManager } from '@/components/admin/ShowroomStaffManager'
import { getShowroomStaff, ShowroomWorkflowError } from '@/lib/admin/showroom-service'
import { requirePermission } from '@/lib/auth/require-permission'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission('showroom.manage')
  const { id } = await params
  let data: Awaited<ReturnType<typeof getShowroomStaff>>
  try {
    data = await getShowroomStaff(id)
  } catch (error) {
    if (error instanceof ShowroomWorkflowError && error.httpStatus === 404) notFound()
    throw error
  }
  return <>
    <AdminPageHeader
      title={'Branch Staff — ' + data.showroom.name}
      breadcrumb="Management / Showrooms / Staff"
      text="Manage active staff assignments without changing user roles or duplicating branch information."
    />
    <ShowroomStaffManager initial={data} />
  </>
}
