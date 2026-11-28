import { NextResponse } from 'next/server'
import { adminError } from '@/lib/admin/api'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { prisma } from '@/lib/db/prisma'

/** Idempotent read receipt scoped to the currently authenticated recipient. */
export async function PATCH(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await authorizeAdminRequest('notification.view')
    const { id } = await params
    if (!/^[a-zA-Z0-9_-]{1,120}$/.test(id)) {
      return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })
    }
    const item = await prisma.adminNotification.findFirst({
      where: { id, userId: actor.id },
      select: { id: true, readAt: true },
    })
    if (!item) return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })
    if (!item.readAt) {
      await prisma.adminNotification.updateMany({
        where: { id, userId: actor.id, readAt: null },
        data: { readAt: new Date() },
      })
    }
    return NextResponse.json({ message: 'Notification marked as read.' }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    return adminError(error)
  }
}
