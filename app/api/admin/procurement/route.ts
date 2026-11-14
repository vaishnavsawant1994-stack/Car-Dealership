import { NextResponse } from 'next/server'
import { adminError } from '@/lib/admin/api'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { parseProcurementFilters } from '@/lib/procurement/intake'
import { getProcurementBoard } from '@/lib/procurement/intake-service'

export async function GET(request: Request) {
  try {
    const actor = await authorizeAdminRequest('sellRequest.view')
    const query = new URL(request.url).searchParams
    const filters = parseProcurementFilters({
      stage: query.get('stage'),
      assigned: query.get('assigned'),
      page: query.get('page'),
    })
    const data = await getProcurementBoard(actor, filters)
    return NextResponse.json({ data }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    return adminError(error)
  }
}
