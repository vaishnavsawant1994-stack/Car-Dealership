import { NextResponse } from 'next/server'
import { createOneTimeToken, expiresInMinutes } from '@/lib/auth/tokens'
import { normalizedEmailSchema } from '@/lib/auth/validation'
import { prisma } from '@/lib/db/prisma'
import { sendVerificationEmail } from '@/lib/email/service'
import { checkRateLimit, requestFingerprint } from '@/lib/security/rate-limit'
import { assertDemoEmail, isHostedDemoEnvironment } from '@/lib/security/demo-access'

const responseMessage = 'If that account still needs verification, a new link has been sent.'

export async function POST(request: Request) {
  const limit = await checkRateLimit(requestFingerprint(request, 'resend-verification'), 3, 15 * 60_000)
  if (!limit.allowed) return NextResponse.json({ error: { code: 'RATE_LIMITED', message: 'Please wait before requesting another email.' } }, { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } })
  const body = await request.json().catch(() => null) as { email?: string } | null
  const email = normalizedEmailSchema.safeParse(body?.email)
  if (!email.success) return NextResponse.json({ message: responseMessage })
  if (isHostedDemoEnvironment()) {
    try { assertDemoEmail(email.data) } catch { return NextResponse.json({ message: responseMessage }) }
  }
  const user = await prisma.user.findUnique({ where: { email: email.data } })
  if (!user || user.emailVerified || user.deletedAt) return NextResponse.json({ message: responseMessage })

  const { token, tokenHash } = createOneTimeToken()
  await prisma.$transaction([
    prisma.emailVerificationToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } }),
    prisma.emailVerificationToken.create({ data: { userId: user.id, tokenHash, expiresAt: expiresInMinutes(24 * 60) } }),
  ])
  try {
    await sendVerificationEmail(user.email, user.name ?? 'Customer', token)
  } catch (error) {
    console.error('verification_resend_failed', { userId: user.id, error })
  }
  return NextResponse.json({ message: responseMessage })
}
