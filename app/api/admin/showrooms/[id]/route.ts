import { NextResponse } from 'next/server'
import { z } from 'zod'
import { branchError } from '@/lib/admin/branch-api'
import { editShowroom } from '@/lib/admin/showroom-service'
import { validationError } from '@/lib/admin/api'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { prisma } from '@/lib/db/prisma'
import { showroomSchema } from '@/lib/validation/admin'

const updateSchema = showroomSchema.extend({ version: z.number().int().positive() }).strict()

type Params = { params: Promise<{ id: string }> }

export async function GET(_: Request, { params }: Params) {
  try {
    await authorizeAdminRequest('showroom.manage')
    const { id } = await params
    const data = await prisma.showroom.findUnique({
      where: { id }, include: { _count: { select: { staffAssignments: true } } },
    })
    return data
      ? NextResponse.json({ data }, { headers: { 'Cache-Control': 'private, no-store' } })
      : NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })
  } catch (error) { return branchError(error) }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const actor = await authorizeAdminRequest('showroom.manage')
    const parsed = updateSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors)
    const { id } = await params
    const data = await editShowroom(actor.id, id, parsed.data)
    return NextResponse.json({ data, message: 'Showroom updated.' })
  } catch (error) { return branchError(error) }
}
