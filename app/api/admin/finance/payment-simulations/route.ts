import { NextResponse } from 'next/server'
import { z } from 'zod'
import { adminError } from '@/lib/admin/api'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { runPaymentSandboxSimulation } from '@/lib/finance/invoice-draft-service'
import { paymentMode } from '@/lib/payments/sandbox'

const schema = z.object({
  invoiceDraftId: z.string().cuid(),
  idempotencyKey: z.string().min(24).max(80),
  outcome: z.enum(['APPROVED', 'DECLINED']),
}).strict()

export async function POST(request: Request) {
  try {
    const actor = await authorizeAdminRequest('finance.update')
    if (paymentMode() !== 'sandbox') return NextResponse.json({ error: { code: 'PAYMENT_SANDBOX_DISABLED' } }, { status: 503 })
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: { code: 'INVALID_REQUEST' } }, { status: 400 })
    const { invoiceDraftId, ...input } = parsed.data
    const result = await runPaymentSandboxSimulation(invoiceDraftId, actor, input)
    if (result.type === 'simulated') return NextResponse.json({ data: result.data,
      message: `Sandbox simulation ${result.data.outcome.toLowerCase()}. No funds were moved.` }, { status: 201 })
    if (result.type === 'already-simulated') return NextResponse.json({ data: result.data,
      message: `This sandbox request was already simulated as ${result.data.outcome.toLowerCase()}. No funds were moved.` }, { status: 200 })
    if (result.type === 'idempotency-conflict') return NextResponse.json({ error: { code: 'IDEMPOTENCY_KEY_REUSED' } }, { status: 409 })
    if (result.type === 'disabled') return NextResponse.json({ error: { code: 'PAYMENT_SANDBOX_DISABLED' } }, { status: 503 })
    return NextResponse.json({ error: { code: 'FINANCE_DRAFT_NOT_AVAILABLE' } }, { status: 409 })
  } catch (error) { return adminError(error) }
}
