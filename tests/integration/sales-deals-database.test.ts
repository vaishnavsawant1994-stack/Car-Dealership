import 'dotenv/config'
import { afterAll, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  InquiryStatus, SalesDealAcceptanceMethod, SalesDealStatus, UserRole, UserStatus, VehicleStatus,
} from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { createSalesDeal, getSalesDeal, listSalesDeals, transitionSalesDeal } from '@/lib/sales/deal-service'

const suffix = `p7-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
let showroomId = ''
let vehicleId = ''
let inquiryId = ''
let quoteId = ''
const userIds: string[] = []
const dealIds: string[] = []
const extraShowroomIds: string[] = []
const extraVehicleIds: string[] = []
const extraInquiryIds: string[] = []
const extraQuoteIds: string[] = []

afterAll(async () => {
  if (dealIds.length) {
    await prisma.auditLog.deleteMany({ where: { entity: 'SalesDeal', entityId: { in: dealIds } } })
    await prisma.auditLog.deleteMany({ where: { resourceType: 'SalesDeal', resourceId: { in: dealIds } } })
    await prisma.salesDealEvent.deleteMany({ where: { dealId: { in: dealIds } } })
    await prisma.salesDeal.deleteMany({ where: { id: { in: dealIds } } })
  }
  if (quoteId || extraQuoteIds.length) await prisma.salesQuoteDraft.deleteMany({ where: { id: { in: [quoteId, ...extraQuoteIds].filter(Boolean) } } })
  if (inquiryId || extraInquiryIds.length) await prisma.inquiry.deleteMany({ where: { id: { in: [inquiryId, ...extraInquiryIds].filter(Boolean) } } })
  if (vehicleId || extraVehicleIds.length) await prisma.vehicle.deleteMany({ where: { id: { in: [vehicleId, ...extraVehicleIds].filter(Boolean) } } })
  if (userIds.length) {
    await prisma.showroomStaffAssignment.deleteMany({ where: { userId: { in: userIds } } })
    await prisma.user.deleteMany({ where: { id: { in: userIds } } })
  }
  if (showroomId || extraShowroomIds.length) await prisma.showroom.deleteMany({ where: { id: { in: [showroomId, ...extraShowroomIds].filter(Boolean) } } })
  await prisma.$disconnect()
})

describe('P7 internal sales deal lifecycle', () => {
  it('isolates deals by showroom and assignment, versions transitions, and requires coded outcomes', async () => {
    const database = new URL(process.env.DATABASE_URL ?? 'postgresql://invalid/invalid')
    if (process.env.APP_ENV !== 'test' || !['localhost', '127.0.0.1', '::1'].includes(database.hostname) ||
      database.pathname !== '/car_dealership_test') {
      throw new Error('Sales deal integration tests only run against the isolated loopback CI database.')
    }

    const [referenceVehicle, showroom] = await Promise.all([
      prisma.vehicle.findFirstOrThrow({ select: { brandId: true, bodyTypeId: true } }),
      prisma.showroom.create({ data: {
        name: `Fictional P7 ${suffix}`, address: 'Synthetic Test Road, 1', city: 'Test City',
        state: 'Test State', postalCode: '000001', phone: 'Synthetic only',
        email: `p7-${suffix}@car-dealership.test`, hours: '10:00 - 18:00', active: true, isPrimary: false,
      } }),
    ])
    showroomId = showroom.id

    const sales = await prisma.user.create({ data: {
      email: `p7-sales-${suffix}@car-dealership.test`, name: 'Fictional P7 Sales',
      role: UserRole.SALES, status: UserStatus.ACTIVE, emailVerified: new Date(),
    } })
    const peer = await prisma.user.create({ data: {
      email: `p7-peer-${suffix}@car-dealership.test`, name: 'Fictional P7 Peer',
      role: UserRole.SALES, status: UserStatus.ACTIVE, emailVerified: new Date(),
    } })
    userIds.push(sales.id, peer.id)
    await prisma.showroomStaffAssignment.createMany({ data: [sales, peer].map((user) => ({ userId: user.id, showroomId })) })

    const vehicle = await prisma.vehicle.create({ data: {
      ...referenceVehicle, slug: suffix, stockNumber: suffix.toUpperCase(),
      model: 'Fictional Sedan', variant: 'P7 Internal Test', shortTitle: 'Synthetic Sales Deal Vehicle',
      year: 2024, price: 2_500_000, mileage: 8000, fuelType: 'Petrol', transmission: 'Automatic',
      shortDescription: 'Synthetic vehicle for isolated deal tests.',
      description: 'Fictional data used only in the isolated test database.',
      status: VehicleStatus.AVAILABLE, published: true, showroomId,
    } })
    vehicleId = vehicle.id
    const inquiry = await prisma.inquiry.create({ data: {
      referenceNumber: suffix.toUpperCase(), showroomId, assignedToId: sales.id, vehicleId,
      fullName: 'Fictional P7 Customer', phone: '0000000000', email: `customer-${suffix}@car-dealership.test`,
      message: 'Synthetic request; no external contact.', consentAccepted: false, status: InquiryStatus.IN_PROGRESS,
    } })
    inquiryId = inquiry.id
    const quote = await prisma.salesQuoteDraft.create({ data: {
      inquiryId, vehicleId, createdById: sales.id, vehiclePrice: vehicle.price,
      discountAmount: 50_000, estimatedOtherFees: 10_000,
      estimatedSubtotal: vehicle.price - 40_000, currency: 'INR',
    } })
    quoteId = quote.id

    const opened = await createSalesDeal(inquiryId, sales, quoteId)
    expect(opened.type).toBe('created')
    if (opened.type !== 'created') return
    dealIds.push(opened.data.id)
    expect((await createSalesDeal(inquiryId, sales, quoteId)).type).toBe('already-active')

    const visible = await listSalesDeals(sales)
    expect(visible.some((deal) => deal.id === opened.data.id)).toBe(true)
    expect(await getSalesDeal(opened.data.id, peer)).toBeNull()

    const negotiating = await transitionSalesDeal(opened.data.id, sales, {
      version: 1, status: SalesDealStatus.NEGOTIATION,
    })
    expect(negotiating).toMatchObject({ type: 'updated', data: { status: SalesDealStatus.NEGOTIATION, version: 2 } })
    const missingAcceptance = await transitionSalesDeal(opened.data.id, sales, {
      version: 2, status: SalesDealStatus.WON,
    })
    expect(missingAcceptance).toMatchObject({ type: 'invalid-transition', code: 'ACCEPTANCE_REQUIRED' })
    expect((await transitionSalesDeal(opened.data.id, sales, {
      version: 1, status: SalesDealStatus.OPEN,
    })).type).toBe('conflict')

    const won = await transitionSalesDeal(opened.data.id, sales, {
      version: 2, status: SalesDealStatus.WON,
      acceptanceMethod: SalesDealAcceptanceMethod.CUSTOMER_EMAIL,
    })
    expect(won).toMatchObject({ type: 'updated', data: { status: SalesDealStatus.WON, version: 3 } })
    const detail = await getSalesDeal(opened.data.id, sales)
    expect(detail?.events.map((event) => event.toStatus)).toEqual([
      SalesDealStatus.OPEN, SalesDealStatus.NEGOTIATION, SalesDealStatus.WON,
    ])
    const savedVehicle = await prisma.vehicle.findUniqueOrThrow({ where: { id: vehicleId } })
    expect(savedVehicle.status).toBe(VehicleStatus.AVAILABLE)
    expect(savedVehicle.published).toBe(true)
    expect(await prisma.auditLog.count({ where: { entity: 'SalesDeal', entityId: opened.data.id } })).toBe(3)

    const crossSuffix = `${suffix}-cross-room`
    const foreignShowroom = await prisma.showroom.create({ data: {
      name: `Fictional P7 out-of-scope ${suffix}`, address: 'Synthetic Test Road, 2',
      city: 'Test City', state: 'Test State', postalCode: '000002', phone: 'Synthetic only',
      email: `p7-cross-${suffix}@car-dealership.test`, hours: '10:00 - 18:00', active: true, isPrimary: false,
    } })
    extraShowroomIds.push(foreignShowroom.id)
    const foreignVehicle = await prisma.vehicle.create({ data: {
      ...referenceVehicle, slug: crossSuffix, stockNumber: crossSuffix.toUpperCase(),
      model: 'Fictional Sedan', variant: 'P7 Cross-Showroom', shortTitle: 'Out-of-scope synthetic vehicle',
      year: 2024, price: 2_500_000, mileage: 8000, fuelType: 'Petrol', transmission: 'Automatic',
      shortDescription: 'Synthetic cross-showroom vehicle.',
      description: 'Fictional data used only in the isolated test database.',
      status: VehicleStatus.AVAILABLE, published: true, showroomId: foreignShowroom.id,
    } })
    extraVehicleIds.push(foreignVehicle.id)
    const foreignInquiry = await prisma.inquiry.create({ data: {
      referenceNumber: `${crossSuffix.toUpperCase()}-INQ`, showroomId, assignedToId: sales.id,
      vehicleId: foreignVehicle.id, fullName: 'Fictional Cross-Showroom Customer',
      phone: '0000000001', email: `cross-customer-${suffix}@car-dealership.test`,
      message: 'Synthetic mismatched showroom relation.', status: InquiryStatus.IN_PROGRESS,
    } })
    extraInquiryIds.push(foreignInquiry.id)
    const foreignQuote = await prisma.salesQuoteDraft.create({ data: {
      inquiryId: foreignInquiry.id, vehicleId: foreignVehicle.id, createdById: sales.id,
      vehiclePrice: foreignVehicle.price, discountAmount: 0, estimatedOtherFees: 0,
      estimatedSubtotal: foreignVehicle.price, currency: 'INR',
    } })
    extraQuoteIds.push(foreignQuote.id)

    expect((await createSalesDeal(foreignInquiry.id, sales, foreignQuote.id)).type).toBe('not-found')
    const inconsistentDeal = await prisma.salesDeal.create({ data: {
      referenceNumber: `DEAL-${crossSuffix.toUpperCase()}`, inquiryId: foreignInquiry.id,
      quoteDraftId: foreignQuote.id, vehicleId: foreignVehicle.id, showroomId,
      assignedToId: sales.id, createdById: sales.id,
    } })
    dealIds.push(inconsistentDeal.id)
    expect(await getSalesDeal(inconsistentDeal.id, sales)).toBeNull()
    expect((await listSalesDeals(sales)).some((deal) => deal.id === inconsistentDeal.id)).toBe(false)
    expect((await transitionSalesDeal(inconsistentDeal.id, sales, {
      version: 1, status: SalesDealStatus.NEGOTIATION,
    })).type).toBe('not-found')
  })
})
