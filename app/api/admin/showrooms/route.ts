import { NextResponse } from 'next/server'
import { branchError } from '@/lib/admin/branch-api'
import { createShowroom } from '@/lib/admin/showroom-service'
import { validationError } from '@/lib/admin/api'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { prisma } from '@/lib/db/prisma'
import { showroomSchema } from '@/lib/validation/admin'

export async function GET() {
  try {
    await authorizeAdminRequest('showroom.manage')
    const data = await prisma.showroom.findMany({
      orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
      include: { _count: { select: { staffAssignments: true } } },
    })
    return NextResponse.json({ data }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return branchError(error) }
}

export async function POST(request: Request) {
  try {
    const actor = await authorizeAdminRequest('showroom.manage')
    const parsed = showroomSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors)
    const data = await createShowroom(actor.id, parsed.data)
    return NextResponse.json({ data, message: 'Showroom created.' }, { status: 201 })
  } catch (error) { return branchError(error) }
}
