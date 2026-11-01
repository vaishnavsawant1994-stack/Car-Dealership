import { UserStatus } from '@prisma/client'
import { NextResponse } from 'next/server'
import { hashPassword } from '@/lib/auth/password'
import { createOneTimeToken, expiresInMinutes } from '@/lib/auth/tokens'
import { signUpSchema } from '@/lib/auth/validation'
import { prisma } from '@/lib/db/prisma'
import { sendVerificationEmail } from '@/lib/email/service'
import { checkRateLimit, requestFingerprint } from '@/lib/security/rate-limit'
import { canUseSelfRegistration } from '@/lib/security/demo-access'
import { logSafeError } from '@/lib/observability/safe-log'

export async function POST(request: Request) {
  if (!canUseSelfRegistration()) return NextResponse.json({ error: { code: 'DEMO_REGISTRATION_DISABLED', message: 'Public account registration is unavailable in the protected demonstration.' } }, { status: 403 })
  const limit = await checkRateLimit(requestFingerprint(request, 'register'), 5, 15 * 60_000)
  if (!limit.allowed) return NextResponse.json({ error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please try again later.' } }, { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } })

  const parsed = signUpSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: { code: 'INVALID_REQUEST', message: 'Please check your details.', fields: parsed.error.flatten().fieldErrors } }, { status: 400 })

  const existing = await prisma.user.findFirst({ where: { OR: [{ email: parsed.data.email }, { phone: parsed.data.phone }] }, select: { email: true, phone: true } })
  if (existing) return NextResponse.json({ error: { code: 'ACCOUNT_EXISTS', message: existing.email === parsed.data.email ? 'An account already uses this email address.' : 'An account already uses this mobile number.' } }, { status: 409 })

  const passwordHash = await hashPassword(parsed.data.password)
  const { token, tokenHash } = createOneTimeToken()
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        passwordHash,
        status: UserStatus.PENDING_VERIFICATION,
        notificationSettings: {
          create: {
            marketingEmails: parsed.data.marketingConsent,
            marketingConsentedAt: parsed.data.marketingConsent ? new Date() : null,
          },
        },
      },
    })
    await tx.emailVerificationToken.create({ data: { userId: created.id, tokenHash, expiresAt: expiresInMinutes(24 * 60) } })
    await tx.auditLog.create({ data: { actorId: created.id, action: 'ACCOUNT_REGISTERED', entity: 'User', entityId: created.id, metadata: { termsAccepted: true } } })
    return created
  })

  try {
    const email = await sendVerificationEmail(user.email, user.name ?? 'Customer', token)
    return NextResponse.json({ data: { email: user.email, verificationRequired: true, emailPreview: email.preview }, message: 'Account created. Check your email to verify it.' }, { status: 201 })
  } catch (error) {
    logSafeError('verification_email_failed', error, { userId: user.id })
    return NextResponse.json({ data: { email: user.email, verificationRequired: true }, error: { code: 'EMAIL_DELIVERY_FAILED', message: 'Your account was created, but the verification email could not be sent. Use resend verification.' } }, { status: 503 })
  }
}
