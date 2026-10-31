import { NextResponse } from 'next/server'
import { isHostedDemoEnvironment } from '@/lib/security/demo-access'
import { prisma } from '@/lib/db/prisma'
import { testDriveSchema } from '@/lib/validation/leads'
import { getAuthenticatedUser } from '@/lib/auth/session'
import { createReferenceNumber } from '@/lib/references'
import { sendEngagementConfirmation, sendLeadNotification } from '@/lib/email/service'
import { checkRateLimit, requestFingerprint } from '@/lib/security/rate-limit'

export async function POST(request: Request) {
  if (isHostedDemoEnvironment()) return NextResponse.json({ error: { code: 'DEMO_READ_ONLY', message: 'Public submissions are disabled in the protected demonstration. Use fictional seeded scenarios instead.' } }, { status: 403 })
  const limit = await checkRateLimit(requestFingerprint(request, 'test-drive'), 5, 10 * 60_000)
  if (!limit.allowed) return NextResponse.json({ error: { code: 'RATE_LIMITED', message: 'Too many test-drive requests were submitted. Please try again shortly.' } }, { status: 429 })
  const parsed = testDriveSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: { code: 'INVALID_REQUEST', message: 'Please check the test-drive details.', fields: parsed.error.flatten().fieldErrors } }, { status: 400 })
  try {
    const [user, vehicle, duplicate] = await Promise.all([
      getAuthenticatedUser(),
      prisma.vehicle.findFirst({
        where: { id: parsed.data.vehicleId, published: true, status: { in: ['AVAILABLE', 'RESERVED'] } },
        select: { id: true, shortTitle: true, stockNumber: true },
      }),
      prisma.testDrive.findFirst({ where: { vehicleId: parsed.data.vehicleId, email: parsed.data.email.toLowerCase(), preferredDate: parsed.data.preferredDate, status: { notIn: ['CANCELLED', 'REJECTED'] }, createdAt: { gt: new Date(Date.now() - 10 * 60_000) } }, select: { referenceNumber: true } }),
    ])
    if (!vehicle) return NextResponse.json({ error: { code: 'VEHICLE_UNAVAILABLE', message: 'This vehicle is no longer available for a test drive.' } }, { status: 409 })
    if (duplicate) return NextResponse.json({ error: { code: 'DUPLICATE_REQUEST', message: `A matching test drive already exists. Reference: ${duplicate.referenceNumber}` } }, { status: 409 })
    const referenceNumber = await createReferenceNumber('TD')
    const testDrive = await prisma.testDrive.create({
      data: {
        referenceNumber,
        userId: user?.id,
        vehicleId: parsed.data.vehicleId,
        fullName: user?.name ?? parsed.data.name,
        phone: user?.phone ?? parsed.data.phone,
        email: user?.email ?? parsed.data.email.toLowerCase(),
        preferredDate: parsed.data.preferredDate,
        preferredTime: parsed.data.preferredTime,
        message: parsed.data.message,
        consentAccepted: parsed.data.consent,
      },
      select: { id: true, referenceNumber: true, status: true, createdAt: true, email: true, fullName: true, phone: true, message: true, preferredDate: true, preferredTime: true },
    })
    try { await sendEngagementConfirmation(testDrive.email, testDrive.fullName, testDrive.referenceNumber, 'test drive') } catch (emailError) { console.error('test_drive_confirmation_failed', { testDriveId: testDrive.id, emailError }) }
    try {
      await sendLeadNotification('test drive', {
        reference: testDrive.referenceNumber,
        customerName: testDrive.fullName,
        customerEmail: testDrive.email,
        customerPhone: testDrive.phone,
        vehicleTitle: vehicle.shortTitle,
        vehicleStockNumber: vehicle.stockNumber,
        message: testDrive.message,
        preferredDate: testDrive.preferredDate,
        preferredTime: testDrive.preferredTime,
      })
    } catch (emailError) {
      console.error('test_drive_staff_notification_failed', { testDriveId: testDrive.id, emailError })
    }
    return NextResponse.json({ data: { id: testDrive.id, referenceNumber: testDrive.referenceNumber, status: testDrive.status, createdAt: testDrive.createdAt }, message: `Test-drive request received. Your reference is ${testDrive.referenceNumber}.` }, { status: 201 })
  } catch (error) {
    console.error('test_drive_create_failed', { error })
    return NextResponse.json({ error: { code: 'SUBMISSION_FAILED', message: 'The test-drive request could not be submitted.' } }, { status: 503 })
  }
}
