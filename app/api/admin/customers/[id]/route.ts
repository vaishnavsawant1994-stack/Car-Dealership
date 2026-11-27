import { NextResponse } from 'next/server'
import { adminError } from '@/lib/admin/api'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { getCustomer360 } from '@/lib/crm/customer-service'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await authorizeAdminRequest('user.view')
    const { id } = await params
    const result = await getCustomer360(id)
    if (!result) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Customer account not found.' } }, { status: 404 })
    return NextResponse.json({ data: result }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return adminError(error) }
}
