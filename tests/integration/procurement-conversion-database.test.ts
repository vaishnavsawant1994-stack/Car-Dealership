import 'dotenv/config'
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { RequestStatus, VehicleStatus } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { convertProcurementSchema } from '@/lib/procurement/draft-conversion'
import { createVehicleFromProcurement } from '@/lib/procurement/draft-conversion-service'

const generated = { sells: [] as string[], vehicles: [] as string[] }
const unique = () => `procurement-test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

afterEach(async () => {
  const vehicles = generated.vehicles.splice(0)
  const sells = generated.sells.splice(0)
  if (vehicles.length) {
    await prisma.auditLog.deleteMany({
      where: { action: 'PROCUREMENT_DRAFT_CREATED', resourceId: { in: vehicles } },
    })
    await prisma.vehicle.deleteMany({ where: { id: { in: vehicles } } })
  }
  if (sells.length) {
    await prisma.sellRequest.deleteMany({ where: { id: { in: sells } } })
  }
})
afterAll(async () => prisma.$disconnect())

describe('P2-03 database-backed procurement inventory conversion', () => {
  it('creates exactly one unpublished vehicle draft with an audit event and a CAS version increment', async () => {
    const [actor, brand, bodyType] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { email: 'operations@deccanwheels.local' } }),
      prisma.brand.findFirstOrThrow({ select: { id: true } }),
      prisma.bodyType.findFirstOrThrow({ select: { id: true } }),
    ])
    const reference = unique()
    const sell = await prisma.sellRequest.create({
      data: {
        referenceNumber: reference,
        assignedToId: actor.id,
        status: RequestStatus.COMPLETED,
        name: 'Fictional Procurement Seller',
        make: 'Fictional',
        model: 'Inspection Sedan',
        year: 2023,
        mileage: 12_000,
        inspection: {
          create: {
            exteriorScore: 8,
            interiorScore: 9,
            mechanicalScore: 8,
            overallConditionScore: 8,
            documentsVerified: true,
            completedAt: new Date(),
          },
        },
        valuations: {
          create: {
            createdById: actor.id,
            marketMinimum: 1_500_000,
            marketMaximum: 1_900_000,
            recommendedOffer: 1_700_000,
            finalOffer: 1_650_000,
            validUntil: new Date(Date.now() + 7 * 86_400_000),
          },
        },
      },
    })
    generated.sells.push(sell.id)
    const payload = convertProcurementSchema.parse({
      version: sell.version,
      vehicle: {
        brandId: brand.id,
        bodyTypeId: bodyType.id,
        model: 'Inspection Sedan',
        variant: 'Verified Model',
        stockNumber: `TEST-${Date.now()}-${Math.floor(Math.random()*100000)}`,
        slug: reference,
        shortTitle: 'Synthetic Procurement Inventory Draft',
        year: 2023,
        price: 2_100_000,
        mileage: 12_000,
        currency: 'INR',
        fuelType: 'Petrol',
        transmission: 'Automatic',
        shortDescription: 'Fictional used vehicle for isolated integration testing.',
        description: 'A deliberately fictional acquired vehicle used only for the isolated Car Dealership procurement integration test.',
      },
    })

    const created = await createVehicleFromProcurement(sell.id, actor, payload)
    expect(created.type).toBe('created')
    if (created.type !== 'created') return
    generated.vehicles.push(created.data.id)

    const [vehicle, updatedSource, audit] = await Promise.all([
      prisma.vehicle.findUniqueOrThrow({ where: { id: created.data.id } }),
      prisma.sellRequest.findUniqueOrThrow({ where: { id: sell.id } }),
      prisma.auditLog.findFirst({ where: { action: 'PROCUREMENT_DRAFT_CREATED', resourceId: created.data.id } }),
    ])
    expect(vehicle.procurementRequestId).toBe(sell.id)
    expect(vehicle.status).toBe(VehicleStatus.DRAFT)
    expect(vehicle.published).toBe(false)
    expect(updatedSource.version).toBe(sell.version + 1)
    expect(audit?.actorId).toBe(actor.id)
    expect((await createVehicleFromProcurement(sell.id, actor, payload)).type).toBe('already-converted')
  })

  it('refuses a seller request without completed acquisition evidence', async () => {
    const actor = await prisma.user.findUniqueOrThrow({ where: { email: 'operations@deccanwheels.local' } })
    const sell = await prisma.sellRequest.create({
      data: { referenceNumber: unique(), status: RequestStatus.SUBMITTED, assignedToId: actor.id },
    })
    generated.sells.push(sell.id)
    const result = await createVehicleFromProcurement(sell.id, actor, {
      version: sell.version, vehicle: {} as never,
    })
    expect(result).toMatchObject({ type: 'not-ready' })
    expect((await prisma.sellRequest.findUniqueOrThrow({ where: { id: sell.id } })).version).toBe(sell.version)
  })

  it('hides another staff member assigned procurement from a focused role', async () => {
    const [actor, colleague] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { email: 'operations@deccanwheels.local' } }),
      prisma.user.findUniqueOrThrow({ where: { email: 'sales@deccanwheels.local' } }),
    ])
    const sell = await prisma.sellRequest.create({
      data: { referenceNumber: unique(), status: RequestStatus.COMPLETED, assignedToId: colleague.id },
    })
    generated.sells.push(sell.id)
    const result = await createVehicleFromProcurement(sell.id, actor, {
      version: sell.version, vehicle: {} as never,
    })
    expect(result.type).toBe('not-found')
  })
})
