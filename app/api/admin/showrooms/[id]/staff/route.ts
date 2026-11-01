import { NextResponse } from 'next/server'
import { branchError } from '@/lib/admin/branch-api'
import { assignShowroomStaff, getShowroomStaff } from '@/lib/admin/showroom-service'
import { validationError } from '@/lib/admin/api'
import { staffAssignmentSchema } from '@/lib/admin/showroom-policy'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'

type Params = { params: Promise<{ id: string }> }

export async function GET(_: Request, { params }: Params) {
  try {
    await authorizeAdminRequest('showroom.manage')
    const { id } = await params
    return NextResponse.json({ data: await getShowroomStaff(id) },
      { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return branchError(error) }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const actor = await authorizeAdminRequest('showroom.manage')
    const parsed = staffAssignmentSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors)
    const { id } = await params
    const data = await assignShowroomStaff(actor.id, id, parsed.data.userId)
    return NextResponse.json({ data, message: 'Staff member assigned.' }, { status: 201 })
  } catch (error) { return branchError(error) }
}
