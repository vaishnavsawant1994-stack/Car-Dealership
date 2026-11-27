import { NextResponse } from 'next/server'
import { DeliveryCaseStatus } from '@prisma/client'
import { z } from 'zod'
import { adminError } from '@/lib/admin/api'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { transitionDeliveryCase } from '@/lib/delivery/delivery-service'

const schema = z.object({ version: z.number().int().positive(), status: z.nativeEnum(DeliveryCaseStatus), customerAcknowledged: z.boolean().optional() }).strict()

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await authorizeAdminRequest('delivery.update')
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: { code: 'INVALID_REQUEST' } }, { status: 400 })
    const { id } = await context.params
    const result = await transitionDeliveryCase(id, actor, parsed.data)
    if (result.type === 'updated') return NextResponse.json({ data: result, message: 'Delivery preparation status updated.' })
    const status = result.type === 'not-available' ? 404 : 409
    return NextResponse.json({ error: { code: result.type === 'checks-incomplete' ? 'CHECKLIST_INCOMPLETE' : result.type.toUpperCase().replaceAll('-', '_') } }, { status })
  } catch (error) { return adminError(error) }
}
