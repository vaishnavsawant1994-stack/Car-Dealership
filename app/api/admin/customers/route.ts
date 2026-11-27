import { NextResponse } from 'next/server'
import { adminError } from '@/lib/admin/api'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { parseCustomerFilters } from '@/lib/crm/customer-query'
import { listCustomers } from '@/lib/crm/customer-service'

export async function GET(request: Request) {
  try {
    await authorizeAdminRequest('user.view')
    const q = new URL(request.url).searchParams
    const filters = parseCustomerFilters({ page: q.get('page'), search: q.get('search'), status: q.get('status') })
    const result = await listCustomers(filters)
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return adminError(error) }
}
