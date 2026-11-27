import { NextResponse } from 'next/server'
import { SalesDealStatus } from '@prisma/client'
import { adminError } from '@/lib/admin/api'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { listSalesDeals } from '@/lib/sales/deal-service'

export async function GET(request: Request) {
  try {
    const actor = await authorizeAdminRequest('enquiry.view')
    const value = new URL(request.url).searchParams.get('status')
    const status = value && Object.values(SalesDealStatus).includes(value as SalesDealStatus)
      ? value as SalesDealStatus : undefined
    if (value && !status) return NextResponse.json({ error: { code: 'INVALID_STATUS' } }, { status: 400 })
    const data = await listSalesDeals(actor, status)
    return NextResponse.json({ data }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return adminError(error) }
}
