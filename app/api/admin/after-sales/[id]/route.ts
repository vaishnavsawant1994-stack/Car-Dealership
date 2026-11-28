import { NextResponse } from 'next/server'
import { z } from 'zod'
import { adminError } from '@/lib/admin/api'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { completeAfterSalesTask } from '@/lib/after-sales/after-sales-service'

const schema = z.object({ version: z.number().int().positive() }).strict()

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await authorizeAdminRequest('afterSales.update')
    const { id } = await params
    const parsed = schema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: { code: 'INVALID_REQUEST' } }, { status: 400 })
    const result = await completeAfterSalesTask(id, parsed.data.version, actor)
    if (result.type === 'completed') return NextResponse.json({ data: result })
    if (result.type === 'conflict') return NextResponse.json({ error: { code: 'TASK_VERSION_CONFLICT' } }, { status: 409 })
    return NextResponse.json({ error: { code: 'TASK_NOT_AVAILABLE' } }, { status: 404 })
  } catch (error) { return adminError(error) }
}
