import { NextResponse } from 'next/server'
import { AfterSalesTaskType } from '@prisma/client'
import { z } from 'zod'
import { adminError } from '@/lib/admin/api'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { createAfterSalesTask, listAfterSalesTasks, listEligibleDeliveredCases } from '@/lib/after-sales/after-sales-service'

const schema = z.object({ deliveryCaseId: z.string().cuid(), type: z.nativeEnum(AfterSalesTaskType), dueAt: z.iso.datetime() }).strict()

export async function GET() {
  try {
    const actor = await authorizeAdminRequest('afterSales.view')
    const [data, eligibleDeliveries] = await Promise.all([listAfterSalesTasks(actor), listEligibleDeliveredCases(actor)])
    return NextResponse.json({ data, eligibleDeliveries }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return adminError(error) }
}

export async function POST(request: Request) {
  try {
    const actor = await authorizeAdminRequest('afterSales.update')
    const parsed = schema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: { code: 'INVALID_REQUEST' } }, { status: 400 })
    const result = await createAfterSalesTask(parsed.data, actor)
    if (result.type === 'created') return NextResponse.json({ data: result.data }, { status: 201 })
    if (result.type === 'already-scheduled') return NextResponse.json({ error: { code: 'TASK_ALREADY_SCHEDULED' } }, { status: 409 })
    if (result.type === 'invalid-date') return NextResponse.json({ error: { code: 'INVALID_DUE_DATE' } }, { status: 400 })
    return NextResponse.json({ error: { code: 'DELIVERY_NOT_AVAILABLE' } }, { status: 404 })
  } catch (error) { return adminError(error) }
}
