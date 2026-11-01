import { NextResponse } from 'next/server'
import { branchError } from '@/lib/admin/branch-api'
import { removeShowroomStaff } from '@/lib/admin/showroom-service'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'

export async function DELETE(_: Request, { params }: {
  params: Promise<{ id: string; userId: string }>
}) {
  try {
    const actor = await authorizeAdminRequest('showroom.manage')
    const { id, userId } = await params
    const data = await removeShowroomStaff(actor.id, id, userId)
    return NextResponse.json({ data, message: 'Staff assignment removed.' })
  } catch (error) { return branchError(error) }
}
