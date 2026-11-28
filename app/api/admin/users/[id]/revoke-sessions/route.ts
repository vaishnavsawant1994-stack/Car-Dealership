import { NextResponse } from 'next/server'
import { staffLifecycleError } from '@/lib/admin/staff-lifecycle-api'
import { revokeStaffSessions } from '@/lib/admin/staff-lifecycle-service'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await authorizeAdminRequest('session.revoke')
    const { id } = await params
    const data = await revokeStaffSessions(actor, id)
    return NextResponse.json({ data, message: 'All login sessions revoked.' })
  } catch (error) { return staffLifecycleError(error) }
}
