import { NextResponse } from 'next/server'
import { z } from 'zod'
import { adminError } from '@/lib/admin/api'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { issueWorkshopPartRequest } from '@/lib/parts/parts-service'

const schema = z.object({ version: z.number().int().positive() }).strict()

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await authorizeAdminRequest('parts.update')
    const { id } = await params
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: { code: 'INVALID_REQUEST' } }, { status: 400 })
    const result = await issueWorkshopPartRequest({ id, version: parsed.data.version }, actor)
    if (result.type === 'issued') return NextResponse.json({ data: result })
    if (result.type === 'insufficient-stock') return NextResponse.json({ error: { code: 'INSUFFICIENT_BRANCH_STOCK' } }, { status: 409 })
    if (result.type === 'conflict') return NextResponse.json({ error: { code: 'REQUEST_VERSION_CONFLICT' } }, { status: 409 })
    return NextResponse.json({ error: { code: 'PART_REQUEST_NOT_AVAILABLE' } }, { status: 404 })
  } catch (error) { return adminError(error) }
}
