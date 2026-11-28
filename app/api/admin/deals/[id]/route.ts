import { NextResponse } from 'next/server'
import { adminError, conflictError, validationError } from '@/lib/admin/api'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { transitionSalesDeal } from '@/lib/sales/deal-service'
import { transitionSalesDealSchema } from '@/lib/sales/deal-policy'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await authorizeAdminRequest('enquiry.update')
    const parsed = transitionSalesDealSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors)
    const { id } = await params
    const result = await transitionSalesDeal(id, actor, parsed.data)
    if (result.type === 'not-found') return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })
    if (result.type === 'conflict') return conflictError('This deal changed in another session. Refresh before updating it.')
    if (result.type === 'invalid-transition') return NextResponse.json({
      error: { code: result.code, message: result.code === 'ACCEPTANCE_REQUIRED'
        ? 'Record the customer acceptance method before closing this deal as won.'
        : result.code === 'LOSS_REASON_REQUIRED'
          ? 'Choose a reason before closing this deal as lost.'
          : 'The requested status change is not permitted.' },
    }, { status: 409 })
    return NextResponse.json({ data: result.data, message: 'Deal status updated.' }, {
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch (error) { return adminError(error) }
}
