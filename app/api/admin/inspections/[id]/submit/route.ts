import { NextResponse } from 'next/server'
import { z } from 'zod'
import { adminError, conflictError, validationError } from '@/lib/admin/api'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { submitVehicleInspection } from '@/lib/inspection/inspection-service'

const schema = z.object({ version: z.number().int().positive() }).strict()

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await authorizeAdminRequest('vehicle.update')
    const { id } = await params
    const parsed = schema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors)
    const result = await submitVehicleInspection(id, actor, parsed.data.version)
    if (result.type === 'not-found') {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Inspection not found.' } }, { status: 404 })
    }
    if (result.type === 'conflict') return conflictError()
    if (result.type === 'not-editable') {
      return NextResponse.json({ error: { code: 'INSPECTION_LOCKED', message: 'This inspection is already submitted or reviewed.' } }, { status: 409 })
    }
    if (result.type === 'not-ready') {
      return NextResponse.json({ error: {
        code: 'INSPECTION_INCOMPLETE', message: 'All checks need results and failed checks need explanations.',
        assessment: result.assessment,
      } }, { status: 409 })
    }
    return NextResponse.json({ data: { version: result.version }, message: 'Inspection submitted for review.' }, {
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch (error) { return adminError(error) }
}
