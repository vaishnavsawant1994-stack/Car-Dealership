import { UserRole } from '@prisma/client'
import { NextResponse } from 'next/server'
import { adminError, validationError } from '@/lib/admin/api'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { mayManageInvitationRole } from '@/lib/admin/staff-lifecycle-policy'
import { writeAuditLog } from '@/lib/admin/audit'
import { createOneTimeToken, expiresInMinutes } from '@/lib/auth/tokens'
import { prisma } from '@/lib/db/prisma'
import { sendStaffInvitationEmail } from '@/lib/email/service'
import { staffInviteSchema } from '@/lib/validation/admin'
import { isHostedDemoEnvironment } from '@/lib/security/demo-access'

export async function GET(request: Request) {
  try {
    await authorizeAdminRequest('user.view')
    const query = new URL(request.url).searchParams
    const search = query.get('search')?.trim().slice(0, 100)
    const data = await prisma.user.findMany({
      where: {
        deletedAt: null, role: { not: UserRole.CUSTOMER },
        ...(search ? { OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ] } : {}),
      },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
      take: 200,
      select: {
        id: true, name: true, email: true, phone: true, role: true, status: true,
        emailVerified: true, lastLoginAt: true, createdAt: true, sessionVersion: true,
        showroomAssignments: { select: { showroom: {
          select: { id: true, name: true, active: true },
        } } },
        _count: { select: { sessions: true } },
      },
    })
    return NextResponse.json({ data }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return adminError(error) }
}

export async function POST(request: Request) {
  // Hosted demos have no approved invitations or external delivery.
  if (isHostedDemoEnvironment()) {
    return NextResponse.json({ error: { code: 'DEMO_INVITATIONS_DISABLED',
      message: 'Staff invitations remain disabled until protected deployment review.' } }, { status: 403 })
  }
  try {
    const actor = await authorizeAdminRequest('user.invite')
    const parsed = staffInviteSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors)
    if (!mayManageInvitationRole(actor.role, parsed.data.role)) {
      return NextResponse.json({ error: { code: 'FORBIDDEN',
        message: 'Only a Super Admin may invite another administrator.' } }, { status: 403 })
    }
    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } })
    if (existing) return NextResponse.json({ error: { code: 'ACCOUNT_EXISTS',
      message: 'An account already uses this email.' } }, { status: 409 })
    const pending = await prisma.staffInvitation.findFirst({
      where: { email: parsed.data.email, usedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true },
    })
    if (pending) return NextResponse.json({ error: { code: 'INVITATION_PENDING',
      message: 'A valid invitation already exists; revoke it before re-inviting.' } }, { status: 409 })
    const { token, tokenHash } = createOneTimeToken()
    const invitation = await prisma.$transaction(async (tx) => {
      const row = await tx.staffInvitation.create({
        data: { email: parsed.data.email, role: parsed.data.role,
          tokenHash, invitedById: actor.id, expiresAt: expiresInMinutes(48 * 60) },
      })
      await tx.auditLog.create({ data: {
        actorId: actor.id, action: 'STAFF_INVITED',
        entity: 'StaffInvitation', entityId: row.id,
        resourceType: 'StaffInvitation', resourceId: row.id,
        summary: 'Created expiring, one-time staff invitation.',
        metadata: { role: row.role },
      } })
      return row
    })
    let preview = false
    try {
      preview = (await sendStaffInvitationEmail(invitation.email, token, invitation.role)).preview
    } catch {
      // Do not log tokens, personal email addresses or error payloads.
      console.error('staff_invitation_delivery_failed', { invitationId: invitation.id })
    }
    const previewVisible = process.env.NODE_ENV !== 'production'
    return NextResponse.json({
      data: { id: invitation.id, email: invitation.email, expiresAt: invitation.expiresAt,
        ...(preview && previewVisible ? { previewUrl: '/staff-invitation?token=' + encodeURIComponent(token) } : {}) },
      message: preview ? 'Invitation created in development preview.' : 'Invitation created. Review delivery status before relying on it.',
    }, { status: 201, headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return adminError(error) }
}
