import { NextResponse } from 'next/server'
import { isHostedDemoEnvironment } from '@/lib/security/demo-access'
import { prisma } from '@/lib/db/prisma'
import { inquirySchema } from '@/lib/validation/leads'
import { getAuthenticatedUser } from '@/lib/auth/session'
import { createReferenceNumber } from '@/lib/references'
import { sendEngagementConfirmation, sendLeadNotification } from '@/lib/email/service'
import { checkRateLimit, requestFingerprint } from '@/lib/security/rate-limit'

export async function POST(request: Request) {
  if (isHostedDemoEnvironment()) return NextResponse.json({ error: { code: 'DEMO_READ_ONLY', message: 'Public submissions are disabled in the protected demonstration. Use fictional seeded scenarios instead.' } }, { status: 403 })
  const limit = await checkRateLimit(requestFingerprint(request, 'inquiry'), 6, 10 * 60_000)
  if (!limit.allowed) return NextResponse.json({ error: { code: 'RATE_LIMITED', message: 'Too many enquiries were submitted. Please try again shortly.' } }, { status: 429 })
  const parsed = inquirySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: { code: 'INVALID_REQUEST', message: 'Please check the enquiry details.', fields: parsed.error.flatten().fieldErrors } }, { status: 400 })
  try {
    const [user, vehicle, duplicate] = await Promise.all([
      getAuthenticatedUser(),
      prisma.vehicle.findFirst({
        where: { id: parsed.data.vehicleId, published: true, status: { in: ['AVAILABLE', 'RESERVED'] } },
        select: { id: true, shortTitle: true, stockNumber: true },
      }),
      prisma.inquiry.findFirst({ where: { vehicleId: parsed.data.vehicleId, email: parsed.data.email.toLowerCase(), createdAt: { gt: new Date(Date.now() - 2 * 60_000) } }, select: { referenceNumber: true } }),
    ])
    if (!vehicle) return NextResponse.json({ error: { code: 'VEHICLE_UNAVAILABLE', message: 'This vehicle is no longer available for enquiries.' } }, { status: 409 })
    if (duplicate) return NextResponse.json({ error: { code: 'DUPLICATE_REQUEST', message: `We already received this enquiry. Reference: ${duplicate.referenceNumber}` } }, { status: 409 })
    const referenceNumber = await createReferenceNumber('ENQ')
    const inquiry = await prisma.inquiry.create({
      data: {
        referenceNumber,
        userId: user?.id,
        vehicleId: parsed.data.vehicleId,
        fullName: user?.name ?? parsed.data.name,
        phone: user?.phone ?? parsed.data.phone,
        email: user?.email ?? parsed.data.email.toLowerCase(),
        message: parsed.data.message,
        consentAccepted: parsed.data.consent,
      },
      select: { id: true, referenceNumber: true, createdAt: true, email: true, fullName: true, phone: true, message: true },
    })
    try { await sendEngagementConfirmation(inquiry.email, inquiry.fullName, inquiry.referenceNumber, 'enquiry') } catch (emailError) { console.error('inquiry_confirmation_failed', { inquiryId: inquiry.id, emailError }) }
    try {
      await sendLeadNotification('enquiry', {
        reference: inquiry.referenceNumber,
        customerName: inquiry.fullName,
        customerEmail: inquiry.email,
        customerPhone: inquiry.phone,
        vehicleTitle: vehicle.shortTitle,
        vehicleStockNumber: vehicle.stockNumber,
        message: inquiry.message,
      })
    } catch (emailError) {
      console.error('inquiry_staff_notification_failed', { inquiryId: inquiry.id, emailError })
    }
    return NextResponse.json({ data: { id: inquiry.id, referenceNumber: inquiry.referenceNumber, createdAt: inquiry.createdAt }, message: `Enquiry received. Your reference is ${inquiry.referenceNumber}.` }, { status: 201 })
  } catch (error) {
    console.error('inquiry_create_failed', { error })
    return NextResponse.json({ error: { code: 'SUBMISSION_FAILED', message: 'The enquiry could not be submitted.' } }, { status: 503 })
  }
}
