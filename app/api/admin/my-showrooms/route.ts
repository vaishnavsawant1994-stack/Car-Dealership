import { NextResponse } from 'next/server'
import { adminError } from '@/lib/admin/api'
import { myActiveShowrooms } from '@/lib/admin/showroom-service'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'

/** A staff member sees only active showrooms they are explicitly assigned to. */
export async function GET() {
  try {
    const actor = await authorizeAdminRequest('dashboard.view')
    const data = await myActiveShowrooms(actor.id)
    return NextResponse.json({ data: data.map(({ showroom }) => showroom) },
      { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return adminError(error) }
}
