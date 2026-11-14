import { NextResponse } from 'next/server'
import { isHostedDemoEnvironment } from '@/lib/security/demo-access'
import { sellRequestSchema } from '@/lib/validation/forms'
import { getAuthenticatedUser } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'
import { createReferenceNumber } from '@/lib/references'
import { checkRateLimit, requestFingerprint } from '@/lib/security/rate-limit'
import { deleteSellAttachment, storeSellAttachment, type StoredSellAttachment } from '@/lib/storage/sell-request-storage'
import { logSafeError } from '@/lib/observability/safe-log'

export async function POST(request: Request) {
  if (isHostedDemoEnvironment()) return NextResponse.json({ error: { code: 'DEMO_READ_ONLY', message: 'Public submissions are disabled in the protected demonstration. Use fictional seeded scenarios instead.' } }, { status: 403 })
  const limit = await checkRateLimit(requestFingerprint(request, 'sell-request'), 4, 15 * 60_000)
  if (!limit.allowed) return NextResponse.json({ message: limit.unavailable ? 'Valuation requests are temporarily unavailable.' : 'Too many valuation requests were submitted. Please try again later.' }, { status: limit.unavailable ? 503 : 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } })
  const contentType = request.headers.get('content-type') ?? ''
  const form = contentType.includes('multipart/form-data') ? await request.formData().catch(() => null) : null
  const payload = form ? Object.fromEntries(Array.from(form.entries()).filter(([, value]) => typeof value === 'string')) : await request.json().catch(() => null)
  const files = form ? form.getAll('attachments').filter((value): value is File => value instanceof File && value.size > 0) : []
  if (files.length > 8) return NextResponse.json({ message: 'Upload no more than 8 files.' }, { status: 400 })
  const result = sellRequestSchema.safeParse(payload)

  if (!result.success) {
    return NextResponse.json(
      { message: 'Please review the valuation details and try again.', issues: result.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  try {
    const user = await getAuthenticatedUser()
    const reference = await createReferenceNumber('SELL')
    const sellRequest = await prisma.sellRequest.create({
      data: {
        referenceNumber: reference,
        userId: user?.id,
        status: 'SUBMITTED',
        name: user?.name ?? result.data.name,
        phone: user?.phone ?? result.data.phone,
        email: user?.email ?? result.data.email.toLowerCase(),
        make: result.data.make,
        model: result.data.model,
        year: result.data.year,
        mileage: result.data.mileage,
        fuelType: result.data.fuel,
        transmission: result.data.transmission,
        city: result.data.city,
        message: result.data.message,
      },
    })
    const stored: StoredSellAttachment[] = []
    try {
      for (const file of files) {
        const attachment = await storeSellAttachment(sellRequest.id, file)
        if (stored.some((item) => item.checksum === attachment.checksum)) {
          await deleteSellAttachment(attachment.storageKey)
          continue
        }
        stored.push(attachment)
      }
      if (stored.length) await prisma.sellRequestAttachment.createMany({ data: stored.map((attachment) => ({ ...attachment, sellRequestId: sellRequest.id })) })
    } catch (error) {
      await Promise.all(stored.map((attachment) => deleteSellAttachment(attachment.storageKey)))
      await prisma.sellRequest.delete({ where: { id: sellRequest.id } })
      throw error
    }
    return NextResponse.json({ success: true, reference, message: `Valuation request ${reference} received. Our buying team will call you shortly.` }, { status: 201 })
  } catch (error) {
    logSafeError('sell_request_create_failed', error)
    return NextResponse.json({ message: 'The valuation request could not be submitted. Please try again.' }, { status: 503 })
  }
}
