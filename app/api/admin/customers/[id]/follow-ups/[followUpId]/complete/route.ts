import { NextResponse } from 'next/server'
import { adminError } from '@/lib/admin/api'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { completeCustomerFollowUp } from '@/lib/crm/customer-followup-service'

export async function POST(_: Request, { params }: { params: Promise<{ id: string; followUpId: string }> }) {
  try {
    const actor = await authorizeAdminRequest('user.view')
    const { id, followUpId } = await params
    const result = await completeCustomerFollowUp(id, followUpId, actor)
    if (result.type === 'not-found') {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Follow-up task not found.' } }, { status: 404 })
    }
    return NextResponse.json({
      message: result.type === 'already-completed' ? 'Follow-up is already complete.' : 'Follow-up completed.',
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return adminError(error) }
}
