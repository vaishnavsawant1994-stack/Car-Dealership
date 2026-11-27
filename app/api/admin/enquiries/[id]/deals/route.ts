import { NextResponse } from 'next/server'
import { adminError, conflictError, validationError } from '@/lib/admin/api'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { createSalesDeal } from '@/lib/sales/deal-service'
import { createSalesDealSchema } from '@/lib/sales/deal-policy'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await authorizeAdminRequest('enquiry.update')
    const parsed = createSalesDealSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors)
    const { id } = await params
    const result = await createSalesDeal(id, actor, parsed.data.quoteDraftId)
    if (result.type === 'not-found') return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })
    if (result.type === 'quote-not-found') return NextResponse.json({ error: { code: 'QUOTE_NOT_FOUND' } }, { status: 404 })
    if (result.type === 'not-available') return NextResponse.json({
      error: { code: 'NOT_AVAILABLE', message: 'An open enquiry for a published, available INR-priced vehicle is required.' },
    }, { status: 409 })
    if (result.type === 'quote-stale') return NextResponse.json({
      error: { code: 'QUOTE_STALE', message: 'The vehicle price changed after this worksheet was created. Create a fresh worksheet.' },
    }, { status: 409 })
    if (result.type === 'already-active') return conflictError('This enquiry already has an active sales deal.')
    return NextResponse.json({ data: result.data,
      message: 'Internal sales deal opened. No vehicle reservation, customer message, invoice or payment was created.' }, {
      status: 201, headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? (error as { code?: unknown }).code : undefined
    if (code === 'P2002' || code === 'P2034') return conflictError('The enquiry or quote changed in another session. Refresh and try again.')
    return adminError(error)
  }
}
