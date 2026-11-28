import { VehicleCheckResult } from '@prisma/client'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { adminError, conflictError, validationError } from '@/lib/admin/api'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { updateVehicleInspectionCheck } from '@/lib/inspection/inspection-service'

const schema = z.object({
  code: z.string().regex(/^[A-Z]+_[0-9]{2}$/),
  result: z.enum(VehicleCheckResult),
  remarks: z.string().trim().max(1000).default(''),
  version: z.number().int().positive(),
}).strict()

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await authorizeAdminRequest('vehicle.update')
    const { id } = await params
    const parsed = schema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors)
    const outcome = await updateVehicleInspectionCheck(id, actor, parsed.data)
    switch (outcome.type) {
      case 'not-found':
        return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Inspection not found.' } }, { status: 404 })
      case 'invalid-check':
      case 'remarks-required':
        return NextResponse.json({ error: { code: 'INVALID_CHECK', message: outcome.type === 'remarks-required' ?
          'Explain failed checks before saving.' : 'Unknown checklist item.' } }, { status: 400 })
      case 'conflict':
        return conflictError()
      case 'not-editable':
        return NextResponse.json({ error: { code: 'INSPECTION_LOCKED', message: 'A submitted or reviewed inspection cannot be edited.' } }, { status: 409 })
      case 'updated':
        return NextResponse.json({ data: { version: outcome.version }, message: 'Check saved.' }, {
          headers: { 'Cache-Control': 'private, no-store' },
        })
    }
  } catch (error) {
    return adminError(error)
  }
}
