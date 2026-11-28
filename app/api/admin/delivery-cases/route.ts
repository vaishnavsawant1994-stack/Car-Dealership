import { NextResponse } from 'next/server'
import { z } from 'zod'
import { adminError } from '@/lib/admin/api'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { createDeliveryCase, listDeliveryCases, listEligibleDealsForDelivery } from '@/lib/delivery/delivery-service'

const createSchema = z.object({ dealId: z.string().cuid() }).strict()

export async function GET() {
  try {
    const actor = await authorizeAdminRequest('delivery.view')
    const [data, eligibleDeals] = await Promise.all([listDeliveryCases(actor), listEligibleDealsForDelivery(actor)])
    return NextResponse.json({ data, eligibleDeals }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return adminError(error) }
}

export async function POST(request: Request) {
  try {
    const actor = await authorizeAdminRequest('delivery.update')
    const parsed = createSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: { code: 'INVALID_REQUEST' } }, { status: 400 })
    const result = await createDeliveryCase(parsed.data.dealId, actor)
    if (result.type === 'created') return NextResponse.json({ data: result.data,
      message: 'Delivery preparation opened and the vehicle reserved. No customer message or transfer submission was made.' }, { status: 201 })
    if (result.type === 'conflict') return NextResponse.json({ error: { code: 'VEHICLE_RESERVATION_CONFLICT' } }, { status: 409 })
    return NextResponse.json({ error: { code: 'DEAL_NOT_AVAILABLE_FOR_DELIVERY' } }, { status: 409 })
  } catch (error) { return adminError(error) }
}
