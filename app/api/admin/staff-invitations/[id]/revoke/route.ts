import { NextResponse } from 'next/server'
import { staffInvitationRevokeSchema } from '@/lib/admin/staff-lifecycle-policy'
import { staffLifecycleError } from '@/lib/admin/staff-lifecycle-api'
import { revokeStaffInvitation } from '@/lib/admin/staff-lifecycle-service'
import { validationError } from '@/lib/admin/api'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await authorizeAdminRequest('user.invite')
    const parsed = staffInvitationRevokeSchema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors)
    const { id } = await params
    const data = await revokeStaffInvitation(actor, id, parsed.data.reason)
    return NextResponse.json({ data, message: 'Invitation revoked.' })
  } catch (error) { return staffLifecycleError(error) }
}
