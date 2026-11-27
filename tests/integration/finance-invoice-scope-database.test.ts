import 'dotenv/config'
import { afterAll, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  InquiryStatus, SalesDealAcceptanceMethod, SalesDealStatus, UserRole, UserStatus, VehicleStatus,
} from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import {
  createSalesInvoiceDraft, listSalesInvoiceDrafts, listWonSalesDealsForFinance,
} from '@/lib/finance/invoice-draft-service'

const suffix = `p8-scope-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
const fixture = {
  showroomIds: [] as string[],
  userId: '',
  vehicleId: '',
  inquiryId: '',
  quoteId: '',
  dealId: '',
  invoiceId: '',
}

afterAll(async () => {
  if (fixture.invoiceId) await prisma.salesInvoiceDraft.deleteMany({ where: { id: fixture.invoiceId } })
  if (fixture.dealId) await prisma.salesDeal.deleteMany({ where: { id: fixture.dealId } })
  if (fixture.quoteId) await prisma.salesQuoteDraft.deleteMany({ where: { id: fixture.quoteId } })
  if (fixture.inquiryId) await prisma.inquiry.deleteMany({ where: { id: fixture.inquiryId } })
  if (fixture.vehicleId) await prisma.vehicle.deleteMany({ where: { id: fixture.vehicleId } })
  if (fixture.userId) {
    await prisma.showroomStaffAssignment.deleteMany({ where: { userId: fixture.userId } })
    await prisma.user.delete({ where: { id: fixture.userId } })
  }
  if (fixture.showroomIds.length) await prisma.showroom.deleteMany({ where: { id: { in: fixture.showroomIds } } })
  await prisma.$disconnect()
})

describe('P8 finance showroom isolation', () => {
  it('hides invoice children when a deal showroom differs from its linked vehicle', async () => {
    const database = new URL(process.env.DATABASE_URL ?? 'postgresql://invalid/invalid')
    if (process.env.APP_ENV !== 'test' || !['localhost', '127.0.0.1', '::1'].includes(database.hostname) ||
      database.pathname !== '/car_dealership_test') {
      throw new Error('Finance scope integration tests only run against the isolated loopback CI database.')
    }

    const [referenceVehicle, showroom] = await Promise.all([
      prisma.vehicle.findFirstOrThrow({ select: { brandId: true, bodyTypeId: true } }),
      prisma.showroom.create({ data: {
        name: `Fictional P8 finance ${suffix}`, address: 'Synthetic Test Road, 1',
        city: 'Test City', state: 'Test State', postalCode: '000003', phone: 'Synthetic only',
        email: `p8-finance-${suffix}@car-dealership.test`, hours: '10:00 - 18:00', active: true, isPrimary: false,
      } }),
    ])
    fixture.showroomIds.push(showroom.id)
    const foreignShowroom = await prisma.showroom.create({ data: {
      name: `Fictional P8 out-of-scope ${suffix}`, address: 'Synthetic Test Road, 2',
      city: 'Test City', state: 'Test State', postalCode: '000004', phone: 'Synthetic only',
      email: `p8-foreign-${suffix}@car-dealership.test`, hours: '10:00 - 18:00', active: true, isPrimary: false,
    } })
    fixture.showroomIds.push(foreignShowroom.id)

    const actor = await prisma.user.create({ data: {
      email: `p8-finance-actor-${suffix}@car-dealership.test`, name: 'Fictional Finance Staff',
      role: UserRole.FINANCE, status: UserStatus.ACTIVE, emailVerified: new Date(),
    } })
    fixture.userId = actor.id
    await prisma.showroomStaffAssignment.create({ data: { userId: actor.id, showroomId: showroom.id } })

    const vehicle = await prisma.vehicle.create({ data: {
      ...referenceVehicle, showroomId: foreignShowroom.id, slug: suffix, stockNumber: suffix.toUpperCase(),
      model: 'Fictional Finance Sedan', variant: 'Synthetic', shortTitle: 'Out-of-scope finance vehicle',
      year: 2024, price: 1_500_000, mileage: 9000, fuelType: 'Petrol', transmission: 'Automatic',
      shortDescription: 'Synthetic cross-showroom finance fixture.',
      description: 'Fictional data used only in the isolated test database.',
      status: VehicleStatus.AVAILABLE, published: true, publishedAt: new Date(),
    } })
    fixture.vehicleId = vehicle.id
    const inquiry = await prisma.inquiry.create({ data: {
      referenceNumber: `${suffix.toUpperCase()}-INQ`, showroomId: showroom.id,
      assignedToId: actor.id, vehicleId: vehicle.id, fullName: 'Fictional Buyer',
      phone: '0000000002', email: `p8-buyer-${suffix}@car-dealership.test`,
      message: 'Synthetic mismatched showroom relation.', status: InquiryStatus.IN_PROGRESS,
    } })
    fixture.inquiryId = inquiry.id
    const quote = await prisma.salesQuoteDraft.create({ data: {
      inquiryId: inquiry.id, vehicleId: vehicle.id, createdById: actor.id,
      vehiclePrice: vehicle.price, discountAmount: 0, estimatedOtherFees: 0,
      estimatedSubtotal: vehicle.price, currency: 'INR',
    } })
    fixture.quoteId = quote.id
    const deal = await prisma.salesDeal.create({ data: {
      referenceNumber: `DEAL-${suffix.toUpperCase()}`, inquiryId: inquiry.id, quoteDraftId: quote.id,
      vehicleId: vehicle.id, showroomId: showroom.id, assignedToId: actor.id, createdById: actor.id,
      status: SalesDealStatus.WON, version: 3,
      acceptanceMethod: SalesDealAcceptanceMethod.CUSTOMER_EMAIL, closedAt: new Date(),
    } })
    fixture.dealId = deal.id
    const invoice = await prisma.salesInvoiceDraft.create({ data: {
      referenceNumber: `DRAFT-${suffix.toUpperCase()}`, dealId: deal.id, createdById: actor.id,
      vehicleTitle: vehicle.shortTitle, stockNumber: vehicle.stockNumber,
      vehiclePrice: vehicle.price, discountAmount: 0, estimatedOtherFees: 0,
      estimatedSubtotal: vehicle.price, currency: 'INR',
    } })
    fixture.invoiceId = invoice.id

    expect((await listSalesInvoiceDrafts(actor)).some((row) => row.id === invoice.id)).toBe(false)
    expect((await listWonSalesDealsForFinance(actor)).some((row) => row.id === deal.id)).toBe(false)
    expect(await createSalesInvoiceDraft(deal.id, actor)).toEqual({ type: 'not-available' })
  })
})
