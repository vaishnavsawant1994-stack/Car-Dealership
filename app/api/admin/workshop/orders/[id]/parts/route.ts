import { NextResponse } from 'next/server'
import { z } from 'zod'
import { adminError } from '@/lib/admin/api'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { createWorkshopPartRequest } from '@/lib/parts/parts-service'

const schema = z.object({ partId: z.string().cuid(), quantity: z.string() }).strict()

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await authorizeAdminRequest('workshop.update')
    const { id } = await params
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: { code: 'INVALID_REQUEST' } }, { status: 400 })
    const result = await createWorkshopPartRequest({ workshopOrderId: id, ...parsed.data }, actor)
    if (result.type === 'requested') return NextResponse.json({ data: result.data }, { status: 201 })
    if (result.type === 'invalid-quantity') return NextResponse.json({ error: { code: 'INVALID_QUANTITY' } }, { status: 400 })
    return NextResponse.json({ error: { code: 'WORKSHOP_ORDER_OR_PART_NOT_AVAILABLE' } }, { status: 404 })
  } catch (error) { return adminError(error) }
}
