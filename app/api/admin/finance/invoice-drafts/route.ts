import { NextResponse } from 'next/server'
import { z } from 'zod'
import { adminError } from '@/lib/admin/api'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { createSalesInvoiceDraft, listSalesInvoiceDrafts, listWonSalesDealsForFinance } from '@/lib/finance/invoice-draft-service'
import { paymentMode } from '@/lib/payments/sandbox'

const createSchema = z.object({ dealId: z.string().cuid() }).strict()

export async function GET() {
  try {
    const actor = await authorizeAdminRequest('finance.view')
    const [data, eligibleDeals] = await Promise.all([listSalesInvoiceDrafts(actor), listWonSalesDealsForFinance(actor)])
    return NextResponse.json({ data, eligibleDeals, sandboxEnabled: paymentMode() === 'sandbox' }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return adminError(error) }
}

export async function POST(request: Request) {
  try {
    const actor = await authorizeAdminRequest('finance.update')
    const parsed = createSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: { code: 'INVALID_REQUEST' } }, { status: 400 })
    const result = await createSalesInvoiceDraft(parsed.data.dealId, actor)
    if (result.type === 'created') return NextResponse.json({ data: result.data,
      message: 'Internal finance worksheet created. It is not a tax invoice and no payment was requested.' }, { status: 201 })
    if (result.type === 'already-created') return NextResponse.json({ data: result.data,
      message: 'An internal draft already exists for this deal.' }, { status: 200 })
    if (result.type === 'invalid-amounts') return NextResponse.json({ error: { code: 'INVALID_QUOTE_AMOUNTS' } }, { status: 409 })
    return NextResponse.json({ error: { code: 'DEAL_NOT_AVAILABLE_FOR_FINANCE_DRAFT' } }, { status: 409 })
  } catch (error) { return adminError(error) }
}
