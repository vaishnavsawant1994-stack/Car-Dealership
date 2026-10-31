import { NextResponse } from 'next/server'
import { isHostedDemoEnvironment } from '@/lib/security/demo-access'
import { prisma } from '@/lib/db/prisma'
import { createReferenceNumber } from '@/lib/references'
import { contactSchema } from '@/lib/validation/forms'
import { checkRateLimit, requestFingerprint } from '@/lib/security/rate-limit'

export async function POST(request: Request) {
  if (isHostedDemoEnvironment()) return NextResponse.json({ error: { code: 'DEMO_READ_ONLY', message: 'Public submissions are disabled in the protected demonstration. Use fictional seeded scenarios instead.' } }, { status: 403 })
  const limit = await checkRateLimit(requestFingerprint(request, 'contact'), 5, 10 * 60_000)
  if (!limit.allowed) return NextResponse.json({ message: limit.unavailable ? 'The contact service is temporarily unavailable.' : 'Too many messages. Please try again later.' }, { status: limit.unavailable ? 503 : 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } })
  const result = contactSchema.safeParse(await request.json().catch(() => null))

  if (!result.success) {
    return NextResponse.json(
      { message: 'Please correct the highlighted contact fields.', issues: result.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const duplicate = await prisma.contactMessage.findFirst({ where: { email: result.data.email.toLowerCase(), message: result.data.message, createdAt: { gt: new Date(Date.now() - 2 * 60_000) } }, select: { referenceNumber: true } })
  if (duplicate) return NextResponse.json({ message: `We already received this message. Reference: ${duplicate.referenceNumber}` }, { status: 409 })
  const referenceNumber = await createReferenceNumber('CON')
  const contact = await prisma.contactMessage.create({ data: { referenceNumber, name: result.data.name, phone: result.data.phone, email: result.data.email.toLowerCase(), subject: result.data.subject, message: result.data.message } })
  const recipients = await prisma.user.findMany({ where: { role: { in: ['SALES', 'ADMIN', 'SUPER_ADMIN'] }, status: 'ACTIVE', deletedAt: null }, select: { id: true } })
  if (recipients.length) await prisma.adminNotification.createMany({ data: recipients.map(({ id }) => ({ userId: id, type: 'NEW_CONTACT_MESSAGE', title: 'New contact message', message: `${contact.name} submitted ${contact.referenceNumber}.`, resourceType: 'ContactMessage', resourceId: contact.id })) })
  return NextResponse.json({ message: `Thanks. Our showroom team will contact you shortly. Reference: ${referenceNumber}`, saved: true, referenceNumber }, { status: 201 })
}
