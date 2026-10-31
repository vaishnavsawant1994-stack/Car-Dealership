import { NextResponse } from 'next/server'
import { isHostedDemoEnvironment } from '@/lib/security/demo-access'
import { NewsletterStatus } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { newsletterSchema } from '@/lib/validation/forms'
import { checkRateLimit, requestFingerprint } from '@/lib/security/rate-limit'

export async function POST(request: Request) {
  if (isHostedDemoEnvironment()) return NextResponse.json({ error: { code: 'DEMO_READ_ONLY', message: 'Public submissions are disabled in the protected demonstration. Use fictional seeded scenarios instead.' } }, { status: 403 })
  const limit = await checkRateLimit(requestFingerprint(request, 'newsletter'), 5, 15 * 60_000)
  if (!limit.allowed) return NextResponse.json({ message: limit.unavailable ? 'Newsletter signup is temporarily unavailable.' : 'Too many attempts. Please try again later.' }, { status: limit.unavailable ? 503 : 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } })
  const result = newsletterSchema.safeParse(await request.json().catch(() => null))

  if (!result.success) {
    return NextResponse.json({ message: 'Enter a valid email address.' }, { status: 400 })
  }

  const email = result.data.email.toLowerCase()
  const existing = await prisma.newsletterSubscriber.findUnique({ where: { email } })
  if (existing?.status === NewsletterStatus.SUBSCRIBED && existing.active) {
    return NextResponse.json({ message: 'You are already subscribed.' }, { status: 409 })
  }

  const subscriber = await prisma.newsletterSubscriber.upsert({ where: { email }, create: { email, status: NewsletterStatus.SUBSCRIBED, source: 'website', active: true, confirmedAt: new Date() }, update: { status: NewsletterStatus.SUBSCRIBED, active: true, confirmedAt: new Date(), unsubscribedAt: null, suppressedAt: null } })

  return NextResponse.json({
    message: 'Subscribed. You will receive new-arrival updates.',
    subscribedAt: subscriber.consentedAt.toISOString(),
  }, { status: 201 })
}
