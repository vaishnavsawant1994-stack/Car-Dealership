import { NextResponse } from 'next/server'
import { adminError, validationError } from '@/lib/admin/api'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { withdrawCustomerMarketingConsent } from '@/lib/crm/customer-consent-service'
import { withdrawConsentSchema } from '@/lib/crm/customer-consent'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await authorizeAdminRequest('user.update')
    const parsed = withdrawConsentSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors)
    const { id } = await params
    const outcome = await withdrawCustomerMarketingConsent(id, actor.id, parsed.data.channel)
    if (outcome.type === 'not-found') {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Customer not found.' } }, { status: 404 })
    }
    return NextResponse.json({
      message: outcome.type === 'withdrawn' ? 'Promotional communication disabled and audited.' :
        'Promotional communication was already disabled.',
      data: { channel: parsed.data.channel, allowed: false },
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return adminError(error) }
}
