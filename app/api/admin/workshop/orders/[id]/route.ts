import { NextResponse } from 'next/server'
import { WorkshopOrderStatus } from '@prisma/client'
import { z } from 'zod'
import { adminError } from '@/lib/admin/api'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { transitionWorkshopOrder } from '@/lib/workshop/workshop-service'

const schema = z.object({ version: z.number().int().positive(), status: z.nativeEnum(WorkshopOrderStatus) }).strict()

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await authorizeAdminRequest('workshop.update')
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: { code: 'INVALID_REQUEST' } }, { status: 400 })
    const { id } = await context.params
    const result = await transitionWorkshopOrder(id, actor, parsed.data)
    if (result.type === 'updated') return NextResponse.json({ data: result })
    return NextResponse.json({ error: { code: result.type.toUpperCase().replaceAll('-', '_') } }, { status: result.type === 'not-available' ? 404 : 409 })
  } catch (error) { return adminError(error) }
}
