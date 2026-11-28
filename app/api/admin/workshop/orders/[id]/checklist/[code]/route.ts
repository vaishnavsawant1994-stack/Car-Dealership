import { NextResponse } from 'next/server'
import { WorkshopChecklistCode } from '@prisma/client'
import { z } from 'zod'
import { adminError } from '@/lib/admin/api'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { updateWorkshopChecklist } from '@/lib/workshop/workshop-service'

const schema = z.object({ version: z.number().int().positive(), completed: z.boolean() }).strict()

export async function PATCH(request: Request, context: { params: Promise<{ id: string; code: string }> }) {
  try {
    const actor = await authorizeAdminRequest('workshop.update')
    const { id, code } = await context.params
    if (!Object.values(WorkshopChecklistCode).includes(code as WorkshopChecklistCode)) {
      return NextResponse.json({ error: { code: 'INVALID_CHECKLIST_CODE' } }, { status: 400 })
    }
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: { code: 'INVALID_REQUEST' } }, { status: 400 })
    const result = await updateWorkshopChecklist(id, actor, { ...parsed.data, code: code as WorkshopChecklistCode })
    if (result.type === 'updated') return NextResponse.json({ data: result })
    return NextResponse.json({ error: { code: result.type.toUpperCase().replaceAll('-', '_') } }, { status: result.type === 'not-available' ? 404 : 409 })
  } catch (error) { return adminError(error) }
}
