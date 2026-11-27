import 'dotenv/config'
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { UserRole, VehicleCheckResult, VehicleInspectionStatus, VehicleStatus } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { vehicleConditionChecks } from '@/lib/inspection/checklist'
import {
  reviewVehicleInspection, startVehicleInspection, submitVehicleInspection,
  updateVehicleInspectionCheck,
} from '@/lib/inspection/inspection-service'
import { getStaffInspectionReport } from '@/lib/inspection/report-service'

const fixture = { vehicles: [] as string[], inspections: [] as string[] }
const unique = () => `inspection-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

afterEach(async () => {
  if (fixture.inspections.length) {
    await prisma.auditLog.deleteMany({ where: { entity: 'VehicleInspection', entityId: { in: fixture.inspections } } })
    await prisma.vehicleInspection.deleteMany({ where: { id: { in: fixture.inspections.splice(0) } } })
  }
  if (fixture.vehicles.length) {
    await prisma.vehicle.deleteMany({ where: { id: { in: fixture.vehicles.splice(0) } } })
  }
})
afterAll(async () => prisma.$disconnect())

describe('P3-01 PostgreSQL inspection lifecycle', () => {
  it('creates a private 43-check inspection, enforces versions and a second-person approval', async () => {
    const [inspectorAssignment, reviewer, referenceVehicle] = await Promise.all([
      prisma.showroomStaffAssignment.findFirstOrThrow({
        where: { user: { role: UserRole.OPERATIONS, status: 'ACTIVE' }, showroom: { active: true } },
        select: { userId: true, showroomId: true },
      }),
      prisma.user.findFirstOrThrow({ where: { role: UserRole.SUPER_ADMIN, status: 'ACTIVE' } }),
      prisma.vehicle.findFirstOrThrow({ select: { brandId: true, bodyTypeId: true } }),
    ])
    const inspector = await prisma.user.findUniqueOrThrow({ where: { id: inspectorAssignment.userId } })
    const idSuffix = unique()
    const vehicle = await prisma.vehicle.create({
      data: {
        ...referenceVehicle, showroomId: inspectorAssignment.showroomId, slug: idSuffix, stockNumber: idSuffix.toUpperCase(),
        model: 'Fictional Sedan', variant: 'Inspection Test', shortTitle: 'Synthetic Inspection Vehicle',
        year: 2024, price: 2_000_000, mileage: 10000, fuelType: 'Petrol', transmission: 'Automatic',
        shortDescription: 'Synthetic condition inspection fixture.',
        description: 'Fictional inventory created exclusively for local PostgreSQL inspection tests.',
        status: VehicleStatus.DRAFT, published: false,
      },
    })
    fixture.vehicles.push(vehicle.id)

    const unassignedVehicleSuffix = `${idSuffix}-unassigned`
    const unassignedVehicle = await prisma.vehicle.create({
      data: {
        ...referenceVehicle, showroomId: null, slug: unassignedVehicleSuffix, stockNumber: unassignedVehicleSuffix.toUpperCase(),
        model: 'Fictional Sedan', variant: 'Out-of-scope inspection test', shortTitle: 'Unassigned Synthetic Vehicle',
        year: 2024, price: 2_000_000, mileage: 10000, fuelType: 'Petrol', transmission: 'Automatic',
        shortDescription: 'Synthetic vehicle outside the inspector showroom.',
        description: 'Fictional inventory created exclusively for local PostgreSQL inspection tests.',
        status: VehicleStatus.DRAFT, published: false,
      },
    })
    fixture.vehicles.push(unassignedVehicle.id)
    expect((await startVehicleInspection(unassignedVehicle.id, inspector)).type).toBe('not-found')
    const unassignedInspection = await prisma.vehicleInspection.create({
      data: { vehicleId: unassignedVehicle.id, inspectorId: inspector.id, status: VehicleInspectionStatus.DRAFT },
      select: { id: true },
    })
    fixture.inspections.push(unassignedInspection.id)
    expect((await updateVehicleInspectionCheck(unassignedInspection.id, inspector, {
      code: vehicleConditionChecks[0].code, result: VehicleCheckResult.PASS, remarks: 'out of scope', version: 1,
    })).type).toBe('not-found')
    expect((await submitVehicleInspection(unassignedInspection.id, inspector, 1)).type).toBe('not-found')
    expect(await getStaffInspectionReport(unassignedInspection.id, inspector)).toBeNull()

    const opened = await startVehicleInspection(vehicle.id, inspector)
    expect(opened.type).toBe('created')
    if (opened.type !== 'created') return
    fixture.inspections.push(opened.id)
    const current = await prisma.vehicleInspection.findUniqueOrThrow({
      where: { id: opened.id }, include: { checks: true },
    })
    expect(current.checks).toHaveLength(43)
    expect((await startVehicleInspection(vehicle.id, inspector)).type).toBe('existing')
    expect((await startVehicleInspection(vehicle.id, reviewer)).type).toBe('existing')

    const first = vehicleConditionChecks[0].code
    expect((await updateVehicleInspectionCheck(opened.id, inspector, {
      code: first, result: VehicleCheckResult.FAIL, remarks: '', version: 1,
    })).type).toBe('remarks-required')
    const updated = await updateVehicleInspectionCheck(opened.id, inspector, {
      code: first, result: VehicleCheckResult.PASS, remarks: 'VIN verified in synthetic fixture.', version: 1,
    })
    expect(updated).toEqual({ type: 'updated', version: 2 })
    expect((await updateVehicleInspectionCheck(opened.id, inspector, {
      code: first, result: VehicleCheckResult.PASS, remarks: 'stale', version: 1,
    })).type).toBe('conflict')
    expect((await submitVehicleInspection(opened.id, inspector, 2)).type).toBe('not-ready')
    await prisma.vehicleInspectionCheck.updateMany({
      where: { inspectionId: opened.id, result: VehicleCheckResult.NOT_CHECKED },
      data: { result: VehicleCheckResult.PASS },
    })
    expect((await submitVehicleInspection(opened.id, inspector, 2)).type).toBe('submitted')
    expect((await reviewVehicleInspection(opened.id, inspector, {
      approved: true, version: 3, reviewNote: 'Looks fine',
    })).type).toBe('separation-of-duties')
    const approved = await reviewVehicleInspection(opened.id, reviewer, {
      approved: true, version: 3, reviewNote: 'Every synthetic check passed.',
    })
    expect(approved.type).toBe('reviewed')
    const [saved, savedVehicle, audits] = await Promise.all([
      prisma.vehicleInspection.findUniqueOrThrow({ where: { id: opened.id } }),
      prisma.vehicle.findUniqueOrThrow({ where: { id: vehicle.id } }),
      prisma.auditLog.findMany({ where: { entity: 'VehicleInspection', entityId: opened.id } }),
    ])
    expect(saved.status).toBe(VehicleInspectionStatus.APPROVED)
    expect(saved.reviewerId).toBe(reviewer.id)
    expect(savedVehicle.published).toBe(false)
    expect(savedVehicle.certified).toBe(false)
    expect(audits.map((a) => a.action)).toContain('VEHICLE_INSPECTION_APPROVED')
    expect((await updateVehicleInspectionCheck(opened.id, inspector, {
      code: first, result: VehicleCheckResult.FAIL, remarks: 'No longer editable', version: 4,
    })).type).toBe('not-editable')
  })
})

