import { NextResponse } from 'next/server'
import { z } from 'zod'
import { adminError } from '@/lib/admin/api'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { receivePartStock } from '@/lib/parts/parts-service'

const schema = z.object({ partId: z.string().cuid(), showroomId: z.string().cuid(), quantity: z.string(),
  reason: z.string().trim().min(2).max(240), reference: z.string().trim().max(100).optional() }).strict()

export async function POST(request: Request) {
  try {
    const actor = await authorizeAdminRequest('parts.update')
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: { code: 'INVALID_REQUEST' } }, { status: 400 })
    const result = await receivePartStock(parsed.data, actor)
    if (result.type === 'received') return NextResponse.json({ data: result }, { status: 201 })
    if (result.type === 'invalid-quantity') return NextResponse.json({ error: { code: 'INVALID_QUANTITY' } }, { status: 400 })
    return NextResponse.json({ error: { code: 'PART_OR_SHOWROOM_NOT_AVAILABLE' } }, { status: 404 })
  } catch (error) { return adminError(error) }
}
