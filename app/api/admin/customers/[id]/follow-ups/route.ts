import { NextResponse } from 'next/server'
import { adminError, validationError } from '@/lib/admin/api'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { getCustomer360 } from '@/lib/crm/customer-service'
import { createCustomerFollowUp, listCustomerFollowUps } from '@/lib/crm/customer-followup-service'
import { createCustomerFollowUpSchema } from '@/lib/crm/customer-followups'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await authorizeAdminRequest('user.view')
    const { id } = await params
    if (!(await getCustomer360(id))) {
      return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })
    }
    return NextResponse.json({ data: await listCustomerFollowUps(id) }, {
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch (error) { return adminError(error) }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await authorizeAdminRequest('user.view')
    const parsed = createCustomerFollowUpSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors)
    const { id } = await params
    const result = await createCustomerFollowUp(id, actor, parsed.data)
    if (result.type === 'not-found') {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Registered customer not found.' } }, { status: 404 })
    }
    if (result.type === 'invalid-due-date' || result.type === 'invalid-assignee') {
      return NextResponse.json({ error: {
        code: 'INVALID_FOLLOW_UP', message: result.type === 'invalid-due-date'
          ? 'Choose a future due date within the next year.'
          : 'Only active verified administrators can be assigned this private customer task.',
      } }, { status: 400 })
    }
    return NextResponse.json({ data: result.data, message: 'Private follow-up task created.' }, {
      status: 201, headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch (error) { return adminError(error) }
}
