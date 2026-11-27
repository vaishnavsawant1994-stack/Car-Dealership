import 'dotenv/config'
import { afterAll, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { UserRole, VehicleStatus } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { createSalesQuoteDraft, getSalesQuoteDrafts } from '@/lib/sales/quote-service'

afterAll(async () => prisma.$disconnect())

describe('P5-02 PostgreSQL internal pricing snapshots', () => {
  it('creates an immutable snapshot of an available listed vehicle and audits it', async () => {
    if (process.env.APP_ENV !== 'test' || !process.env.DATABASE_URL?.includes('/car_dealership_test')) {
      throw new Error('Sales quote tests must use isolated CI PostgreSQL.')
    }
    const [actor, brand, bodyType] = await Promise.all([
      prisma.user.findFirstOrThrow({ where: { role: UserRole.SUPER_ADMIN } }),
      prisma.brand.findFirstOrThrow({ select: { id: true } }),
      prisma.bodyType.findFirstOrThrow({ select: { id: true } }),
    ])
    const idSuffix = 'quote-test-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7)
    const vehicle = await prisma.vehicle.create({
      data: {
        slug: idSuffix, stockNumber: idSuffix.toUpperCase(), brandId: brand.id, bodyTypeId: bodyType.id,
        model: 'Fictional Quote Sedan', variant: 'Synthetic', shortTitle: 'Fictional Sale Quote Vehicle',
        year: 2024, price: 1_500_000, mileage: 10_000, fuelType: 'Petrol', transmission: 'Automatic',
        shortDescription: 'Fictional test vehicle.', description: 'A synthetic vehicle used only for isolated quote tests.',
        status: VehicleStatus.AVAILABLE, published: true, publishedAt: new Date(), currency: 'INR',
      },
    })
    let inquiryId: string | null = null
    try {
      const inquiry = await prisma.inquiry.create({
        data: {
          referenceNumber: idSuffix, fullName: 'Fictional Buyer',
          phone: '9999999999', email: idSuffix + '@car-dealership.test',
          message: 'Synthetic enquiry for testing only.',
          vehicleId: vehicle.id, assignedToId: actor.id,
        },
      })
      inquiryId = inquiry.id
      const result = await createSalesQuoteDraft(inquiry.id, actor, {
        discountAmount: 50_000, estimatedOtherFees: 10_000,
      })
      expect(result.type).toBe('created')
      if (result.type !== 'created') return
      expect(result.data).toMatchObject({ vehiclePrice: 1_500_000,
        discountAmount: 50_000, estimatedOtherFees: 10_000,
        estimatedSubtotal: 1_460_000, currency: 'INR' })
      const detail = await getSalesQuoteDrafts(inquiry.id, actor)
      expect(detail?.drafts.map((row) => row.id)).toContain(result.data.id)
      const audit = await prisma.auditLog.findFirst({ where: {
        entity: 'SalesQuoteDraft', entityId: result.data.id,
      } })
      expect(audit?.actorId).toBe(actor.id)
      expect(JSON.stringify(audit?.metadata)).not.toContain(inquiry.email)

      const tooLarge = await createSalesQuoteDraft(inquiry.id, actor, {
        discountAmount: 2_000_000, estimatedOtherFees: 0,
      })
      expect(tooLarge.type).toBe('invalid-discount')
      await prisma.vehicle.update({ where: { id: vehicle.id }, data: { status: VehicleStatus.SOLD } })
      expect((await createSalesQuoteDraft(inquiry.id, actor, {
        discountAmount: 0, estimatedOtherFees: 0,
      })).type).toBe('not-available')
      const fresh = await prisma.salesQuoteDraft.findUniqueOrThrow({ where: { id: result.data.id } })
      expect(fresh.vehiclePrice).toBe(1_500_000)
    } finally {
      if (inquiryId) {
        await prisma.salesQuoteDraft.deleteMany({ where: { inquiryId } })
        await prisma.auditLog.deleteMany({ where: { action: 'SALES_INDICATIVE_QUOTE_CREATED', resourceId: inquiryId } })
        await prisma.inquiry.delete({ where: { id: inquiryId } })
      }
      await prisma.vehicle.delete({ where: { id: vehicle.id } })
    }
  })
  it('denies scoped staff quote access outside their active showroom', async () => {
    if (process.env.APP_ENV !== 'test' || !process.env.DATABASE_URL?.includes('/car_dealership_test')) {
      throw new Error('Sales quote tests must use isolated CI PostgreSQL.')
    }
    const assignment = await prisma.showroomStaffAssignment.findFirstOrThrow({
      where: { user: { role: UserRole.OPERATIONS, status: 'ACTIVE' }, showroom: { active: true } },
      select: { userId: true },
    })
    const actorUser = await prisma.user.findUniqueOrThrow({ where: { id: assignment.userId }, select: { id: true, role: true } })
    const actor = { id: actorUser.id, role: actorUser.role }
    const [brand, bodyType] = await Promise.all([
      prisma.brand.findFirstOrThrow({ select: { id: true } }),
      prisma.bodyType.findFirstOrThrow({ select: { id: true } }),
    ])
    const idSuffix = 'quote-scope-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7)
    const vehicle = await prisma.vehicle.create({
      data: {
        slug: idSuffix, stockNumber: idSuffix.toUpperCase(), brandId: brand.id, bodyTypeId: bodyType.id,
        model: 'Fictional Quote Sedan', variant: 'Synthetic', shortTitle: 'Out-of-scope Synthetic Vehicle',
        year: 2024, price: 1_500_000, mileage: 10_000, fuelType: 'Petrol', transmission: 'Automatic',
        shortDescription: 'Synthetic quote scope fixture.', description: 'Test-only vehicle outside assigned showroom scope.',
        status: VehicleStatus.AVAILABLE, published: true, publishedAt: new Date(), currency: 'INR',
      },
    })
    let inquiryId: string | null = null
    try {
      const inquiry = await prisma.inquiry.create({
        data: {
          referenceNumber: idSuffix, fullName: 'Synthetic Buyer',
          phone: '9999999999', email: idSuffix + '@car-dealership.test',
          message: 'Synthetic enquiry for showroom scope testing.',
          vehicleId: vehicle.id, assignedToId: null,
        },
      })
      inquiryId = inquiry.id
      expect(await getSalesQuoteDrafts(inquiry.id, actor)).toBeNull()
      expect((await createSalesQuoteDraft(inquiry.id, actor, {
        discountAmount: 0, estimatedOtherFees: 0,
      })).type).toBe('not-found')
    } finally {
      if (inquiryId) {
        await prisma.salesQuoteDraft.deleteMany({ where: { inquiryId } })
        await prisma.inquiry.delete({ where: { id: inquiryId } })
      }
      await prisma.vehicle.delete({ where: { id: vehicle.id } })
    }
  })

})
