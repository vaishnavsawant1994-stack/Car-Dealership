import { NextResponse } from 'next/server'
import { adminError } from '@/lib/admin/api'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { isFinalInspection } from '@/lib/inspection/report'
import { getStaffInspectionReport } from '@/lib/inspection/report-service'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await authorizeAdminRequest('vehicle.update')
    const { id } = await params
    const report = await getStaffInspectionReport(id, actor)
    if (!report) return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })
    if (!isFinalInspection(report.status)) {
      return NextResponse.json({ error: { code: 'REPORT_NOT_FINAL', message: 'Submit and review this inspection before exporting the report.' } }, { status: 409 })
    }
    return NextResponse.json({ data: report }, { headers: {
      'Cache-Control': 'private, no-store', 'Content-Disposition': 'attachment; filename="vehicle-inspection-report.json"',
      'X-Content-Type-Options': 'nosniff',
    } })
  } catch (error) { return adminError(error) }
}
