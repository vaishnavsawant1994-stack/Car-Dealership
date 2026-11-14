import { NextResponse } from 'next/server'
import { adminError } from '@/lib/admin/api'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { prisma } from '@/lib/db/prisma'

export async function GET(request: Request) {
  try {
    const actor = await authorizeAdminRequest('notification.view')
    const unreadParam = new URL(request.url).searchParams.get('unread')
    if (unreadParam !== null && unreadParam !== 'true' && unreadParam !== 'false') {
      return NextResponse.json({ error: { code: 'INVALID_FILTER', message: 'Unread must be true or false.' } }, { status: 400 })
    }
    const data = await prisma.adminNotification.findMany({
      where: { userId: actor.id, ...(unreadParam === 'true' ? { readAt: null } : {}) },
      take: 100,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    })
    return NextResponse.json({ data }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    return adminError(error)
  }
}

export async function PATCH() {
  try {
    const actor = await authorizeAdminRequest('notification.view')
    const result = await prisma.adminNotification.updateMany({
      where: { userId: actor.id, readAt: null },
      data: { readAt: new Date() },
    })
    return NextResponse.json({ message: 'All notifications marked as read.', updatedCount: result.count }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    return adminError(error)
  }
}
