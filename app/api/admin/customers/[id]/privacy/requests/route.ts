import { NextResponse } from 'next/server'
import { adminError, validationError } from '@/lib/admin/api'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { dataRightsRequestSchema } from '@/lib/crm/data-rights'
import { createCustomerDataRightsRequest, listCustomerDataRightsRequests } from '@/lib/crm/data-rights-service'
import { getCustomer360 } from '@/lib/crm/customer-service'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await authorizeAdminRequest('user.update')
    const { id } = await params
    if (!(await getCustomer360(id))) return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })
    return NextResponse.json({ data: await listCustomerDataRightsRequests(id) },
      { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return adminError(error) }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await authorizeAdminRequest('user.update')
    const parsed = dataRightsRequestSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors)
    const { id } = await params
    const result = await createCustomerDataRightsRequest(id, actor.id, parsed.data.kind)
    if (result.type === 'not-found') return NextResponse.json({
      error: { code: 'NOT_FOUND', message: 'Customer not found.' },
    }, { status: 404 })
    if (result.type === 'already-open') return NextResponse.json({
      error: { code: 'REQUEST_ALREADY_OPEN', message: 'A request of this type is already awaiting review.' },
    }, { status: 409 })
    return NextResponse.json({ data: result.data,
      message: 'Request logged for manual identity verification. No data was exported or erased.' },
      { status: 201, headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error &&
      (error.code === 'P2002' || error.code === 'P2034')) {
      return NextResponse.json({
        error: { code: 'REQUEST_ALREADY_OPEN', message: 'A matching request is already open or was just created.' },
      }, { status: 409 })
    }
    return adminError(error)
  }
}
