import { NextResponse } from 'next/server'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { getCarDealershipEnvironment } from '@/lib/config/isolation'
import { prisma } from '@/lib/db/prisma'
import { adminError } from '@/lib/admin/api'

/** Metadata only. Access to email contents requires a separate audited request. */
export async function GET() {
  try {
    await authorizeAdminRequest('emailCapture.view')
    const environment = getCarDealershipEnvironment()
    const now = new Date()
    const captures = await prisma.capturedEmail.findMany({
      where: { environment, expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { id: true, purpose: true, environment: true, createdAt: true, expiresAt: true, viewedAt: true },
    })
    return NextResponse.json({ data: captures }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return adminError(error) }
}
