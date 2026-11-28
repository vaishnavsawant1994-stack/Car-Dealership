import { NextResponse } from 'next/server'
import { z } from 'zod'
import { adminError } from '@/lib/admin/api'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { createPartAndReceive, listParts, listWorkshopPartRequests } from '@/lib/parts/parts-service'

const createSchema = z.object({ sku: z.string().trim().min(2).max(40), name: z.string().trim().min(2).max(120),
  unit: z.string().trim().min(1).max(20), showroomId: z.string().cuid(), quantity: z.string(), reason: z.string().trim().min(2).max(240) }).strict()

export async function GET() {
  try {
    const actor = await authorizeAdminRequest('parts.view')
    const [inventory, requests] = await Promise.all([listParts(actor), listWorkshopPartRequests(actor)])
    return NextResponse.json({ ...inventory, requests }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return adminError(error) }
}

export async function POST(request: Request) {
  try {
    const actor = await authorizeAdminRequest('parts.update')
    const parsed = createSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: { code: 'INVALID_REQUEST' } }, { status: 400 })
    const result = await createPartAndReceive(parsed.data, actor)
    if (result.type === 'created') return NextResponse.json({ data: result.data }, { status: 201 })
    if (result.type === 'duplicate-sku') return NextResponse.json({ error: { code: 'SKU_ALREADY_EXISTS' } }, { status: 409 })
    if (result.type === 'invalid-quantity') return NextResponse.json({ error: { code: 'INVALID_QUANTITY' } }, { status: 400 })
    return NextResponse.json({ error: { code: 'SHOWROOM_NOT_AVAILABLE' } }, { status: 404 })
  } catch (error) { return adminError(error) }
}
