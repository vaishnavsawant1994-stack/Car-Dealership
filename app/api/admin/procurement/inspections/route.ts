import { NextResponse } from 'next/server'
import { adminError } from '@/lib/admin/api'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { getProcurementInspectionQueue } from '@/lib/procurement/inspection-queue'

export async function GET(request: Request) {
  try {
    const actor = await authorizeAdminRequest('sellRequest.inspect')
    const attention = new URL(request.url).searchParams.get('attention')
    if (attention !== null && attention !== 'true' && attention !== 'false') {
      return NextResponse.json({ error: { code: 'INVALID_FILTER', message: 'Attention must be true or false.' } }, { status: 400 })
    }
    const rows = await getProcurementInspectionQueue(actor)
    const needsAttention = rows.filter((item) => !item.readiness.finalized).length
    return NextResponse.json({
      data: attention === 'true' ? rows.filter((item) => !item.readiness.finalized) : rows,
      summary: { scanned: rows.length, needsAttention, maxScanned: 100 },
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    return adminError(error)
  }
}
