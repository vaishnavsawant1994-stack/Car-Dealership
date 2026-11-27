import { NextResponse } from 'next/server'
import { z } from 'zod'
import { adminError, conflictError, validationError } from '@/lib/admin/api'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { convertProcurementSchema } from '@/lib/procurement/draft-conversion'
import { createVehicleFromProcurement } from '@/lib/procurement/draft-conversion-service'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await authorizeAdminRequest('vehicle.create')
    await authorizeAdminRequest('sellRequest.complete')
    await authorizeAdminRequest('sellRequest.inspect')

    const { id } = await params
    if (!z.string().cuid().safeParse(id).success) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Procurement request not found.' } }, { status: 404 })
    }
    const parsed = convertProcurementSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors)

    const result = await createVehicleFromProcurement(id, actor, parsed.data)
    if (result.type === 'not-found') {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Procurement request not found.' } }, { status: 404 })
    }
    if (result.type === 'already-converted') {
      return NextResponse.json({ error: { code: 'ALREADY_CONVERTED', message: 'This procurement request already has a linked vehicle draft.' } }, { status: 409 })
    }
    if (result.type === 'conflict') return conflictError()
    if (result.type === 'not-ready') {
      return NextResponse.json({ error: {
        code: 'PROCUREMENT_NOT_READY',
        message: 'Complete the required acquisition evidence before creating an inventory draft.',
        missing: result.missing,
      } }, { status: 409 })
    }

    return NextResponse.json({ data: result.data, message: 'Unpublished vehicle draft created from procurement intake.' }, {
      status: 201, headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? (error as { code?: unknown }).code : undefined
    if (code === 'P2002' || code === 'P2034') {
      return conflictError('Inventory or the procurement intake changed. Refresh and try again.')
    }
    if (code === 'P2003') {
      return NextResponse.json({ error: { code: 'INVALID_REFERENCE', message: 'Choose existing brands, types and features.' } }, { status: 400 })
    }
    return adminError(error)
  }
}
