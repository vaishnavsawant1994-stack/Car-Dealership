import { UserRole, VehicleInspectionStatus } from '@prisma/client'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { adminError, validationError } from '@/lib/admin/api'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { prisma } from '@/lib/db/prisma'
import { startVehicleInspection } from '@/lib/inspection/inspection-service'

const startSchema = z.object({ vehicleId: z.string().cuid() }).strict()

export async function GET(request: Request) {
  try {
    const actor = await authorizeAdminRequest('vehicle.update')
    const q = new URL(request.url).searchParams
    const status = z.enum(VehicleInspectionStatus).optional().safeParse(q.get('status') ?? undefined)
    if (!status.success) {
      return NextResponse.json({ error: { code: 'INVALID_STATUS', message: 'Unknown inspection status.' } }, { status: 400 })
    }
    const data = await prisma.vehicleInspection.findMany({
      where: { ...(status.data ? { status: status.data } : {}), ...((actor.role === UserRole.ADMIN || actor.role === UserRole.SUPER_ADMIN) ? {} : { inspectorId: actor.id }) },
      take: 100,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true, vehicleId: true, status: true, version: true,
        createdAt: true, updatedAt: true, submittedAt: true, reviewedAt: true,
        vehicle: { select: { stockNumber: true, shortTitle: true, status: true } },
        inspector: { select: { name: true } },
        reviewer: { select: { name: true } },
        _count: { select: { checks: true } },
      },
    })
    return NextResponse.json({ data }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return adminError(error) }
}

export async function POST(request: Request) {
  try {
    const actor = await authorizeAdminRequest('vehicle.update')
    const parsed = startSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors)
    const result = await startVehicleInspection(parsed.data.vehicleId, actor)
    if (result.type === 'not-found') {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Vehicle not found.' } }, { status: 404 })
    }
    if (result.type === 'busy') {
      return NextResponse.json({ error: { code: 'INSPECTION_IN_USE', message: 'A different inspector is working on this vehicle.' } }, { status: 409 })
    }
    if (result.type === 'existing') {
      return NextResponse.json({ data: { id: result.id }, message: 'An active inspection already exists for this vehicle.' }, { status: 200 })
    }
    return NextResponse.json({ data: { id: result.id }, message: 'Inspection started.' }, { status: 201 })
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? (error as { code?: unknown }).code : undefined
    if (code === 'P2002' || code === 'P2034') {
      return NextResponse.json({ error: { code: 'INSPECTION_CONFLICT', message: 'An inspection has already started. Refresh and try again.' } }, { status: 409 })
    }
    return adminError(error)
  }
}
