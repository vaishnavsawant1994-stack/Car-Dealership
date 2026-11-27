import { NextResponse } from 'next/server'
import { adminError, validationError } from '@/lib/admin/api'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { createIndicativeQuoteSchema } from '@/lib/sales/quote-policy'
import { createSalesQuoteDraft, getSalesQuoteDrafts } from '@/lib/sales/quote-service'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await authorizeAdminRequest('enquiry.view')
    const { id } = await params
    const result = await getSalesQuoteDrafts(id, actor)
    if (!result) return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })
    return NextResponse.json({ data: result }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return adminError(error) }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await authorizeAdminRequest('enquiry.update')
    const parsed = createIndicativeQuoteSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors)
    const { id } = await params
    const result = await createSalesQuoteDraft(id, actor, parsed.data)
    if (result.type === 'not-found') return NextResponse.json({
      error: { code: 'NOT_FOUND', message: 'Enquiry not found.' },
    }, { status: 404 })
    if (result.type === 'not-available') return NextResponse.json({
      error: { code: 'VEHICLE_NOT_AVAILABLE', message: 'An open enquiry for a published, available INR-priced vehicle is required.' },
    }, { status: 409 })
    if (result.type === 'invalid-discount') return NextResponse.json({
      error: { code: 'INVALID_PRICE', message: 'Discount and estimated fees must produce a nonnegative amount.' },
    }, { status: 400 })
    return NextResponse.json({ data: result.data,
      message: 'Internal indicative worksheet saved. No offer or invoice was sent.' },
      { status: 201, headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return adminError(error) }
}
