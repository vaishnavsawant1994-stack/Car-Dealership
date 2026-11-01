import { NextResponse } from 'next/server'
import { adminError } from '@/lib/admin/api'
import { listStaffInvitations } from '@/lib/admin/staff-lifecycle-service'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'

export async function GET() {
  try {
    const actor = await authorizeAdminRequest('user.invite')
    return NextResponse.json({ data: await listStaffInvitations(actor.role) },
      { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return adminError(error) }
}
