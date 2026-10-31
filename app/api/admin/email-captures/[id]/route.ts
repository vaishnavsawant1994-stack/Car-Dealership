import { NextResponse } from 'next/server'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { getCarDealershipEnvironment } from '@/lib/config/isolation'
import { readCaptureKey, openEmail } from '@/lib/email/capture-crypto'
import { prisma } from '@/lib/db/prisma'
import { adminError } from '@/lib/admin/api'
import { writeAuditLog } from '@/lib/admin/audit'

/** Full capture contains short-lived bearer URLs: SUPER_ADMIN only, audited. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await authorizeAdminRequest('emailCapture.view')
    const environment = getCarDealershipEnvironment()
    const { id } = await params
    const capture = await prisma.capturedEmail.findFirst({
      where: { id, environment, expiresAt: { gt: new Date() } },
    })
    if (!capture) return NextResponse.json({ error: { code: 'CAPTURE_NOT_FOUND' } }, { status: 404, headers: { 'Cache-Control': 'private, no-store' } })
    const content = openEmail(capture, readCaptureKey(process.env.EMAIL_CAPTURE_KEY), environment)
    await prisma.capturedEmail.update({ where: { id }, data: { viewedAt: new Date() } })
    await writeAuditLog({
      actorId: actor.id,
      action: 'DEMO_EMAIL_CAPTURE_VIEWED',
      resourceType: 'CapturedEmail',
      resourceId: id,
      summary: 'Restricted demo mail capture accessed.',
      request,
    })
    return NextResponse.json({
      data: { id, purpose: capture.purpose, expiresAt: capture.expiresAt, ...content },
    }, { headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' } })
  } catch (error) { return adminError(error) }
}
