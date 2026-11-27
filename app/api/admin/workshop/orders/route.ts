import { NextResponse } from 'next/server'
import { WorkshopJobType } from '@prisma/client'
import { z } from 'zod'
import { adminError } from '@/lib/admin/api'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { createWorkshopOrder, listEligibleWorkshopVehicles, listWorkshopOrders } from '@/lib/workshop/workshop-service'

const createSchema = z.object({ vehicleId: z.string().cuid(), jobType: z.nativeEnum(WorkshopJobType) }).strict()

export async function GET() {
  try {
    const actor = await authorizeAdminRequest('workshop.view')
    const [data, eligibleVehicles] = await Promise.all([listWorkshopOrders(actor), listEligibleWorkshopVehicles(actor)])
    return NextResponse.json({ data, eligibleVehicles }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return adminError(error) }
}

export async function POST(request: Request) {
  try {
    const actor = await authorizeAdminRequest('workshop.update')
    const parsed = createSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: { code: 'INVALID_REQUEST' } }, { status: 400 })
    const result = await createWorkshopOrder(parsed.data.vehicleId, actor, parsed.data.jobType)
    if (result.type === 'created') return NextResponse.json({ data: result.data,
      message: 'Workshop job card opened. It does not reserve parts, invoice the customer, or send a message.' }, { status: 201 })
    if (result.type === 'already-active') return NextResponse.json({ error: { code: 'ACTIVE_WORKSHOP_ORDER_EXISTS' } }, { status: 409 })
    return NextResponse.json({ error: { code: 'VEHICLE_NOT_AVAILABLE_FOR_WORKSHOP' } }, { status: 409 })
  } catch (error) { return adminError(error) }
}
