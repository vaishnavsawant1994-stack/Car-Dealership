import { NextResponse } from 'next/server'
import { DeliveryChecklistCode } from '@prisma/client'
import { z } from 'zod'
import { adminError } from '@/lib/admin/api'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { updateDeliveryChecklistItem } from '@/lib/delivery/delivery-service'

const schema = z.object({ completed: z.boolean(), version: z.number().int().positive() }).strict()

export async function PATCH(request: Request, context: { params: Promise<{ id: string; code: string }> }) {
  try {
    const { id, code } = await context.params
    if (!Object.values(DeliveryChecklistCode).includes(code as DeliveryChecklistCode)) {
      return NextResponse.json({ error: { code: 'INVALID_CHECKLIST_CODE' } }, { status: 400 })
    }
    const checklistCode = code as DeliveryChecklistCode
    const permission = checklistCode === DeliveryChecklistCode.CLEARED_PAYMENT_VERIFIED ? 'delivery.settlementVerify' : 'delivery.update'
    const actor = await authorizeAdminRequest(permission)
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: { code: 'INVALID_REQUEST' } }, { status: 400 })
    const result = await updateDeliveryChecklistItem(id, actor, { ...parsed.data, code: checklistCode })
    if (result.type === 'updated') return NextResponse.json({ data: result })
    const status = result.type === 'forbidden' ? 403 : result.type === 'not-available' ? 404 : 409
    return NextResponse.json({ error: { code: result.type.toUpperCase().replaceAll('-', '_') } }, { status })
  } catch (error) { return adminError(error) }
}
