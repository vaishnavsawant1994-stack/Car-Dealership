import { NextResponse } from 'next/server'
import { adminError } from '@/lib/admin/api'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { parseSalesFilters } from '@/lib/sales/opportunity-stages'
import { getSalesOpportunityBoard } from '@/lib/sales/opportunity-service'

export async function GET(request: Request) {
  try {
    const actor = await authorizeAdminRequest('enquiry.view')
    await authorizeAdminRequest('testDrive.view')
    const q = new URL(request.url).searchParams
    const data = await getSalesOpportunityBoard(actor, parseSalesFilters({
      stage: q.get('stage'), assignment: q.get('assignment'),
    }))
    return NextResponse.json({ data }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return adminError(error) }
}
