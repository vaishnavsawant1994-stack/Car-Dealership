import { UserRole } from '@prisma/client'
import { NextResponse } from 'next/server'
import { staffLifecycleError } from '@/lib/admin/staff-lifecycle-api'
import { changeStaffLifecycle } from '@/lib/admin/staff-lifecycle-service'
import { adminError, validationError } from '@/lib/admin/api'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { prisma } from '@/lib/db/prisma'
import { staffUpdateSchema } from '@/lib/validation/admin'

type Params = { params: Promise<{ id: string }> }

export async function GET(_: Request, { params }: Params) {
  try {
    await authorizeAdminRequest('user.view')
    const { id } = await params
    const data = await prisma.user.findFirst({
      where: { id, deletedAt: null, role: { not: UserRole.CUSTOMER } },
      select: {
        id: true, name: true, email: true, phone: true, role: true, status: true,
        emailVerified: true, lastLoginAt: true, createdAt: true, sessionVersion: true,
        showroomAssignments: { select: { showroom: {
          select: { id: true, name: true, active: true },
        } } },
        sessions: { select: { expires: true }, orderBy: { expires: 'desc' } },
      },
    })
    return data
      ? NextResponse.json({ data }, { headers: { 'Cache-Control': 'private, no-store' } })
      : NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })
  } catch (error) { return adminError(error) }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const actor = await authorizeAdminRequest('user.update')
    const parsed = staffUpdateSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors)
    const { id } = await params
    const data = await changeStaffLifecycle(actor, id, parsed.data)
    return NextResponse.json({ data, message: 'Staff lifecycle updated. Existing sessions were revoked.' },
      { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return staffLifecycleError(error) }
}
