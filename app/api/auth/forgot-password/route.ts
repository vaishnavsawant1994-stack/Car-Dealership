import { UserStatus } from '@prisma/client'
import { NextResponse } from 'next/server'
import { createOneTimeToken, expiresInMinutes } from '@/lib/auth/tokens'
import { normalizedEmailSchema } from '@/lib/auth/validation'
import { prisma } from '@/lib/db/prisma'
import { sendPasswordResetEmail } from '@/lib/email/service'
import { checkRateLimit, requestFingerprint } from '@/lib/security/rate-limit'
import { assertDemoEmail, isHostedDemoEnvironment } from '@/lib/security/demo-access'
import { logSafeError } from '@/lib/observability/safe-log'

const responseMessage = 'If an active account matches that email, password-reset instructions have been sent.'

export async function POST(request: Request) {
  const limit = await checkRateLimit(requestFingerprint(request, 'forgot-password'), 5, 15 * 60_000)
  if (!limit.allowed) return NextResponse.json({ message: responseMessage })
  const body = await request.json().catch(() => null) as { email?: string } | null
  const email = normalizedEmailSchema.safeParse(body?.email)
  if (!email.success) return NextResponse.json({ message: responseMessage })
  if (isHostedDemoEnvironment()) {
    try { assertDemoEmail(email.data) } catch { return NextResponse.json({ message: responseMessage }) }
  }
  const user = await prisma.user.findUnique({ where: { email: email.data } })
  if (!user || user.status !== UserStatus.ACTIVE || !user.emailVerified || user.deletedAt) return NextResponse.json({ message: responseMessage })

  const { token, tokenHash } = createOneTimeToken()
  await prisma.$transaction([
    prisma.passwordResetToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } }),
    prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt: expiresInMinutes(30) } }),
    prisma.auditLog.create({ data: { actorId: user.id, action: 'PASSWORD_RESET_REQUESTED', entity: 'User', entityId: user.id } }),
  ])
  try {
    await sendPasswordResetEmail(user.email, user.name ?? 'Customer', token)
  } catch (error) {
    logSafeError('password_reset_email_failed', error, { userId: user.id })
  }
  return NextResponse.json({ message: responseMessage })
}
