import 'dotenv/config'
import { afterAll, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  DeliveryCaseStatus, DeliveryChecklistCode, InquiryStatus, SalesDealAcceptanceMethod, SalesDealStatus, UserRole, UserStatus, VehicleStatus,
  WorkshopChecklistCode, WorkshopJobType, WorkshopOrderStatus,
} from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { createSalesDeal, getSalesDeal, listSalesDeals, transitionSalesDeal } from '@/lib/sales/deal-service'
import { createSalesInvoiceDraft, listSalesInvoiceDrafts, listWonSalesDealsForFinance, runPaymentSandboxSimulation } from '@/lib/finance/invoice-draft-service'
import { createDeliveryCase, listDeliveryCases, transitionDeliveryCase, updateDeliveryChecklistItem } from '@/lib/delivery/delivery-service'
import { createWorkshopOrder, listWorkshopOrders, transitionWorkshopOrder, updateWorkshopChecklist } from '@/lib/workshop/workshop-service'

const suffix = `p7-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
let showroomId = ''
let vehicleId = ''
let inquiryId = ''
let quoteId = ''
let invoiceDraftId = ''
let deliveryCaseId = ''
const sandboxAttemptIds: string[] = []
const workshopOrderIds: string[] = []
const originalPaymentMode = process.env.PAYMENT_MODE
const userIds: string[] = []
const dealIds: string[] = []

afterAll(async () => {
  if (workshopOrderIds.length) {
    await prisma.auditLog.deleteMany({ where: { OR: [
      { entity: 'WorkshopOrder', entityId: { in: workshopOrderIds } },
      { resourceType: 'WorkshopOrder', resourceId: { in: workshopOrderIds } },
      { resourceType: 'Vehicle', resourceId: vehicleId },
    ] } })
    await prisma.workshopOrder.deleteMany({ where: { id: { in: workshopOrderIds } } })
  }
  if (deliveryCaseId) {
    await prisma.auditLog.deleteMany({ where: { resourceType: 'DeliveryCase', resourceId: deliveryCaseId } })
    await prisma.auditLog.deleteMany({ where: { entity: 'DeliveryCase', entityId: deliveryCaseId } })
    await prisma.deliveryCase.delete({ where: { id: deliveryCaseId } })
  }
  if (sandboxAttemptIds.length) {
    await prisma.auditLog.deleteMany({ where: { entity: 'PaymentSandboxAttempt', entityId: { in: sandboxAttemptIds } } })
    await prisma.paymentSandboxAttempt.deleteMany({ where: { id: { in: sandboxAttemptIds } } })
  }
  if (invoiceDraftId) {
    await prisma.auditLog.deleteMany({ where: { entity: 'SalesInvoiceDraft', entityId: invoiceDraftId } })
    await prisma.salesInvoiceDraft.delete({ where: { id: invoiceDraftId } })
  }
  if (dealIds.length) {
    await prisma.auditLog.deleteMany({ where: { entity: 'SalesDeal', entityId: { in: dealIds } } })
    await prisma.auditLog.deleteMany({ where: { resourceType: 'SalesDeal', resourceId: { in: dealIds } } })
    await prisma.salesDealEvent.deleteMany({ where: { dealId: { in: dealIds } } })
    await prisma.salesDeal.deleteMany({ where: { id: { in: dealIds } } })
  }
  if (quoteId) await prisma.salesQuoteDraft.deleteMany({ where: { id: quoteId } })
  if (inquiryId) await prisma.inquiry.deleteMany({ where: { id: inquiryId } })
  if (vehicleId) await prisma.vehicle.deleteMany({ where: { id: vehicleId } })
  if (userIds.length) {
    await prisma.showroomStaffAssignment.deleteMany({ where: { userId: { in: userIds } } })
    await prisma.user.deleteMany({ where: { id: { in: userIds } } })
  }
  if (showroomId) await prisma.showroom.delete({ where: { id: showroomId } })
  if (originalPaymentMode === undefined) delete process.env.PAYMENT_MODE
  else process.env.PAYMENT_MODE = originalPaymentMode
  await prisma.$disconnect()
})

describe('P7-P10 internal sales, finance, and delivery lifecycle', () => {
  it('isolates work by showroom/assignment and enforces deal, finance, sandbox, and handover gates', async () => {
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
    const finance = await prisma.user.create({ data: {
      email: `p7-finance-${suffix}@car-dealership.test`, name: 'Fictional P7 Finance',
      role: UserRole.FINANCE, status: UserStatus.ACTIVE, emailVerified: new Date(),
    } })
    const operations = await prisma.user.create({ data: {
      email: `p7-operations-${suffix}@car-dealership.test`, name: 'Fictional P10 Operations',
      role: UserRole.OPERATIONS, status: UserStatus.ACTIVE, emailVerified: new Date(),
    } })
    const workshop = await prisma.user.create({ data: {
      email: `p11-workshop-${suffix}@car-dealership.test`, name: 'Fictional P11 Workshop',
      role: UserRole.WORKSHOP, status: UserStatus.ACTIVE, emailVerified: new Date(),
    } })
    userIds.push(sales.id, peer.id, finance.id, operations.id, workshop.id)
    await prisma.showroomStaffAssignment.createMany({ data: [sales, peer, finance, operations, workshop].map((user) => ({ userId: user.id, showroomId })) })

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
    expect(await listWonSalesDealsForFinance(finance)).toHaveLength(0)

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
    const invoice = await createSalesInvoiceDraft(opened.data.id, finance)
    expect(invoice.type).toBe('created')
    if (invoice.type !== 'created') return
    invoiceDraftId = invoice.data.id
    expect(invoice.data).toMatchObject({ status: 'DRAFT', currency: 'INR', estimatedSubtotal: vehicle.price - 40_000 })
    expect(await listWonSalesDealsForFinance(finance)).toHaveLength(0)
    const worksheets = await listSalesInvoiceDrafts(finance)
    expect(worksheets.map((draft) => draft.id)).toContain(invoice.data.id)
    expect((await createSalesInvoiceDraft(opened.data.id, finance)).type).toBe('already-created')
    process.env.PAYMENT_MODE = 'sandbox'
    const simulationKey = `p9-sandbox-${suffix}-idempotency`
    const simulation = await runPaymentSandboxSimulation(invoice.data.id, finance, { idempotencyKey: simulationKey, outcome: 'APPROVED' })
    expect(simulation.type).toBe('simulated')
    if (simulation.type !== 'simulated') return
    sandboxAttemptIds.push(simulation.data.id)
    expect(simulation.data).toMatchObject({ amount: invoice.data.estimatedSubtotal, currency: 'INR', outcome: 'APPROVED' })
    expect(simulation.data.simulatorReference).toMatch(/^SIM-[A-F0-9]{24}$/)
    expect((await runPaymentSandboxSimulation(invoice.data.id, finance, { idempotencyKey: simulationKey, outcome: 'APPROVED' })).type).toBe('already-simulated')
    expect((await runPaymentSandboxSimulation(invoice.data.id, finance, { idempotencyKey: simulationKey, outcome: 'DECLINED' })).type).toBe('idempotency-conflict')
    const unchangedDraft = await prisma.salesInvoiceDraft.findUniqueOrThrow({ where: { id: invoice.data.id }, select: { status: true, estimatedSubtotal: true } })
    expect(unchangedDraft).toEqual({ status: 'DRAFT', estimatedSubtotal: invoice.data.estimatedSubtotal })
    const openedDelivery = await createDeliveryCase(opened.data.id, operations)
    expect(openedDelivery.type).toBe('created')
    if (openedDelivery.type !== 'created') return
    deliveryCaseId = openedDelivery.data.id
    expect(openedDelivery.data.items).toHaveLength(Object.values(DeliveryChecklistCode).length)
    expect((await listDeliveryCases(operations)).some((entry) => entry.id === deliveryCaseId)).toBe(true)
    expect((await listDeliveryCases(finance)).some((entry) => entry.id === deliveryCaseId)).toBe(true)
    expect((await createDeliveryCase(opened.data.id, operations)).type).toBe('not-available')
    expect((await prisma.vehicle.findUniqueOrThrow({ where: { id: vehicleId } })).status).toBe(VehicleStatus.RESERVED)
    const wrongSettlementRole = await updateDeliveryChecklistItem(deliveryCaseId, operations, {
      code: DeliveryChecklistCode.CLEARED_PAYMENT_VERIFIED, completed: true, version: 1,
    })
    expect(wrongSettlementRole.type).toBe('forbidden')
    for (const item of openedDelivery.data.items) {
      const reviewer = item.code === DeliveryChecklistCode.CLEARED_PAYMENT_VERIFIED ? finance : operations
      const updated = await updateDeliveryChecklistItem(deliveryCaseId, reviewer, {
        code: item.code, completed: true, version: item.version,
      })
      expect(updated.type).toBe('updated')
    }
    const beforeReady = await prisma.deliveryCase.findUniqueOrThrow({ where: { id: deliveryCaseId }, select: { version: true } })
    expect(await transitionDeliveryCase(deliveryCaseId, finance, { version: beforeReady.version, status: DeliveryCaseStatus.READY_FOR_HANDOVER })).toMatchObject({ type: 'invalid-transition' })
    const ready = await transitionDeliveryCase(deliveryCaseId, operations, { version: beforeReady.version, status: DeliveryCaseStatus.READY_FOR_HANDOVER })
    expect(ready.type).toBe('updated')
    const beforeHandover = await prisma.deliveryCase.findUniqueOrThrow({ where: { id: deliveryCaseId }, select: { version: true } })
    expect(await transitionDeliveryCase(deliveryCaseId, operations, { version: beforeHandover.version, status: DeliveryCaseStatus.HANDED_OVER })).toMatchObject({ type: 'invalid-transition' })
    const handedOver = await transitionDeliveryCase(deliveryCaseId, operations, { version: beforeHandover.version, status: DeliveryCaseStatus.HANDED_OVER, customerAcknowledged: true })
    expect(handedOver.type).toBe('updated')
    const detail = await getSalesDeal(opened.data.id, sales)
    expect(detail?.events.map((event) => event.toStatus)).toEqual([
      SalesDealStatus.OPEN, SalesDealStatus.NEGOTIATION, SalesDealStatus.WON,
    ])
    const savedVehicle = await prisma.vehicle.findUniqueOrThrow({ where: { id: vehicleId } })
    expect(savedVehicle.status).toBe(VehicleStatus.SOLD)
    expect(savedVehicle.published).toBe(false)
    expect(await prisma.auditLog.count({ where: { entity: 'SalesDeal', entityId: opened.data.id } })).toBe(3)

    const openedWorkshop = await createWorkshopOrder(vehicleId, workshop, WorkshopJobType.SERVICE)
    expect(openedWorkshop.type).toBe('created')
    if (openedWorkshop.type !== 'created') return
    workshopOrderIds.push(openedWorkshop.data.id)
    expect((await createWorkshopOrder(vehicleId, workshop, WorkshopJobType.REPAIR)).type).toBe('already-active')
    const foreignShowroom = await prisma.showroom.create({ data: {
      name: `Fictional Foreign P11 ${suffix}`, address: 'Synthetic Test Road, 3', city: 'Test City',
      state: 'Test State', postalCode: '000003', phone: 'Synthetic only',
      email: `p11-foreign-${suffix}@car-dealership.test`, hours: '10:00 - 18:00', active: true, isPrimary: false,
    } })
    try {
      await prisma.vehicle.update({ where: { id: vehicleId }, data: { showroomId: foreignShowroom.id } })
      expect((await listWorkshopOrders(workshop)).some((order) => order.id === openedWorkshop.data.id)).toBe(false)
      const item = openedWorkshop.data.checklist[0]
      expect(await updateWorkshopChecklist(openedWorkshop.data.id, workshop, {
        code: item.code, completed: true, version: item.version,
      })).toMatchObject({ type: 'not-available' })
    } finally {
      await prisma.vehicle.update({ where: { id: vehicleId }, data: { showroomId } })
      await prisma.showroom.delete({ where: { id: foreignShowroom.id } })
    }
    expect((await listWorkshopOrders(workshop)).some((order) => order.id === openedWorkshop.data.id)).toBe(true)
    const scheduled = await transitionWorkshopOrder(openedWorkshop.data.id, workshop, { version: 1, status: WorkshopOrderStatus.SCHEDULED })
    expect(scheduled.type).toBe('updated')
    const started = await transitionWorkshopOrder(openedWorkshop.data.id, workshop, { version: 2, status: WorkshopOrderStatus.IN_PROGRESS })
    expect(started.type).toBe('updated')
    expect(await transitionWorkshopOrder(openedWorkshop.data.id, workshop, { version: 3, status: WorkshopOrderStatus.COMPLETED })).toMatchObject({ type: 'checks-incomplete' })
    for (const item of openedWorkshop.data.checklist) {
      expect(await updateWorkshopChecklist(openedWorkshop.data.id, workshop, { code: item.code, completed: true, version: item.version })).toMatchObject({ type: 'updated' })
    }
    const beforeComplete = await prisma.workshopOrder.findUniqueOrThrow({ where: { id: openedWorkshop.data.id }, select: { version: true } })
    expect(await transitionWorkshopOrder(openedWorkshop.data.id, workshop, { version: beforeComplete.version, status: WorkshopOrderStatus.COMPLETED })).toMatchObject({ type: 'updated' })
    expect((await prisma.vehicle.findUniqueOrThrow({ where: { id: vehicleId }, select: { status: true } })).status).toBe(VehicleStatus.SOLD)
  })
})
