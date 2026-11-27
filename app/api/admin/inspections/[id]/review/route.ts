import { NextResponse } from 'next/server'
import { z } from 'zod'
import { adminError, conflictError, validationError } from '@/lib/admin/api'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { reviewVehicleInspection } from '@/lib/inspection/inspection-service'

const schema = z.object({
  approved: z.boolean(),
  version: z.number().int().positive(),
  reviewNote: z.string().trim().max(2000).default(''),
}).strict()

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await authorizeAdminRequest('vehicle.publish')
    const { id } = await params
    const parsed = schema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors)
    const result = await reviewVehicleInspection(id, actor, parsed.data)
    switch (result.type) {
      case 'not-found':
        return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Inspection not found.' } }, { status: 404 })
      case 'separation-of-duties':
        return NextResponse.json({ error: { code: 'REVIEWER_FORBIDDEN', message: 'A different authorized administrator must review this inspection.' } }, { status: 403 })
      case 'reason-required':
        return NextResponse.json({ error: { code: 'REVIEW_REASON_REQUIRED', message: 'Rejection needs a reason of at least 10 characters.' } }, { status: 400 })
      case 'not-reviewable':
        return NextResponse.json({ error: { code: 'NOT_REVIEWABLE', message: 'Submit the inspection before review.' } }, { status: 409 })
      case 'conflict':
        return conflictError()
      case 'not-approvable':
        return NextResponse.json({ error: { code: 'FAILED_CHECKS', message: 'Resolve all failed or missing checks before approval.', assessment: result.assessment } }, { status: 409 })
      case 'reviewed':
        return NextResponse.json({ data: { status: result.status, version: result.version }, message: 'Inspection review recorded.' }, {
          headers: { 'Cache-Control': 'private, no-store' },
        })
    }
  } catch (error) { return adminError(error) }
}
