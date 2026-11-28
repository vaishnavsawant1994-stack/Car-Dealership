import 'dotenv/config'
import { afterAll, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  AfterSalesTaskType, DeliveryCaseStatus, DeliveryChecklistCode, InquiryStatus, SalesDealAcceptanceMethod, SalesDealStatus, UserRole, UserStatus, VehicleStatus,
  WorkshopChecklistCode, WorkshopJobType, WorkshopOrderStatus,
} from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { createSalesDeal, getSalesDeal, listSalesDeals, transitionSalesDeal } from '@/lib/sales/deal-service'
import { getSalesQuoteDrafts } from '@/lib/sales/quote-service'
import { createSalesInvoiceDraft, listSalesInvoiceDrafts, listWonSalesDealsForFinance, runPaymentSandboxSimulation } from '@/lib/finance/invoice-draft-service'
import { createDeliveryCase, listDeliveryCases, listEligibleDealsForDelivery, transitionDeliveryCase, updateDeliveryChecklistItem } from '@/lib/delivery/delivery-service'
import { createWorkshopOrder, listWorkshopOrders, transitionWorkshopOrder, updateWorkshopChecklist } from '@/lib/workshop/workshop-service'
import { createPartAndReceive, createWorkshopPartRequest, issueWorkshopPartRequest, listParts, listWorkshopPartRequests } from '@/lib/parts/parts-service'
import { completeAfterSalesTask, createAfterSalesTask, listAfterSalesTasks } from '@/lib/after-sales/after-sales-service'
import { listCustomerPurchases } from '@/lib/portal/customer-purchase-service'
import { getShowroomAnalytics } from '@/lib/analytics/analytics-service'

const suffix = `p7-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
let showroomId = ''
let vehicleId = ''
let inquiryId = ''
let quoteId = ''
let invoiceDraftId = ''
let deliveryCaseId = ''
const afterSalesTaskIds: string[] = []
const sandboxAttemptIds: string[] = []
const workshopOrderIds: string[] = []
const partIds: string[] = []
const partRequestIds: string[] = []
const originalPaymentMode = process.env.PAYMENT_MODE
const userIds: string[] = []
const dealIds: string[] = []

afterAll(async () => {
  if (afterSalesTaskIds.length) {
    await prisma.auditLog.deleteMany({ where: { entity: 'AfterSalesTask', entityId: { in: afterSalesTaskIds } } })
    await prisma.afterSalesTask.deleteMany({ where: { id: { in: afterSalesTaskIds } } })
  }
  if (partRequestIds.length) {
    await prisma.auditLog.deleteMany({ where: { entity: 'WorkshopPartRequest', entityId: { in: partRequestIds } } })
    await prisma.workshopPartRequest.deleteMany({ where: { id: { in: partRequestIds } } })
  }
  if (partIds.length) {
    const movements = await prisma.partInventoryMovement.findMany({ where: { partId: { in: partIds } }, select: { id: true } })
    const movementIds = movements.map(({ id }) => id)
    await prisma.auditLog.deleteMany({ where: { OR: [
      { entity: 'InventoryPart', entityId: { in: partIds } },
      { resourceType: 'InventoryPart', resourceId: { in: partIds } },
      ...(movementIds.length ? [{ entity: 'PartInventoryMovement', entityId: { in: movementIds } }, { resourceType: 'PartInventoryMovement', resourceId: { in: movementIds } }] : []),
    ] } })
    if (movementIds.length) await prisma.partInventoryMovement.deleteMany({ where: { id: { in: movementIds } } })
    await prisma.inventoryPart.deleteMany({ where: { id: { in: partIds } } })
  }
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

describe('P7-P14 sales, finance, delivery, workshop, parts, after-sales, and customer purchase lifecycle', () => {
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
    const partsManager = await prisma.user.create({ data: {
      email: `p12-parts-manager-${suffix}@car-dealership.test`, name: 'Fictional P12 Parts Manager',
      role: UserRole.PARTS_MANAGER, status: UserStatus.ACTIVE, emailVerified: new Date(),
    } })
    const customer = await prisma.user.create({ data: {
      email: `p14-customer-${suffix}@car-dealership.test`, name: 'Fictional P14 Customer',
      role: UserRole.CUSTOMER, status: UserStatus.ACTIVE, emailVerified: new Date(),
    } })
    const otherCustomer = await prisma.user.create({ data: {
      email: `p14-other-customer-${suffix}@car-dealership.test`, name: 'Fictional Unrelated Customer',
      role: UserRole.CUSTOMER, status: UserStatus.ACTIVE, emailVerified: new Date(),
    } })
    userIds.push(sales.id, peer.id, finance.id, operations.id, workshop.id, partsManager.id, customer.id, otherCustomer.id)
    await prisma.showroomStaffAssignment.createMany({ data: [sales, peer, finance, operations, workshop, partsManager].map((user) => ({ userId: user.id, showroomId })), skipDuplicates: true })

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
      referenceNumber: suffix.toUpperCase(), showroomId, assignedToId: sales.id, userId: customer.id, vehicleId,
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
    await prisma.salesDeal.update({ where: { id: opened.data.id }, data: { assignedToId: finance.id } })
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
    const foreignP10Showroom = await prisma.showroom.create({ data: {
      name: `Fictional Foreign P10 ${suffix}`, address: 'Synthetic Test Road, 2', city: 'Test City',
      state: 'Test State', postalCode: '000002', phone: 'Synthetic only',
      email: `p10-foreign-${suffix}@car-dealership.test`, hours: '10:00 - 18:00', active: true, isPrimary: false,
    } })
    try {
      await prisma.vehicle.update({ where: { id: vehicleId }, data: { showroomId: foreignP10Showroom.id } })
      expect((await listEligibleDealsForDelivery(operations)).some((deal) => deal.id === opened.data.id)).toBe(false)
      expect((await createDeliveryCase(opened.data.id, operations)).type).toBe('not-available')
    } finally {
      await prisma.vehicle.update({ where: { id: vehicleId }, data: { showroomId } })
      await prisma.showroom.delete({ where: { id: foreignP10Showroom.id } })
    }
    const openedDelivery = await createDeliveryCase(opened.data.id, operations)
    expect(openedDelivery.type).toBe('created')
    if (openedDelivery.type !== 'created') return
    deliveryCaseId = openedDelivery.data.id
    const foreignDeliveryShowroom = await prisma.showroom.create({ data: {
      name: `Fictional Foreign Delivery Case ${suffix}`, address: 'Synthetic Test Road, 3', city: 'Test City',
      state: 'Test State', postalCode: '000003', phone: 'Synthetic only',
      email: `delivery-case-foreign-${suffix}@car-dealership.test`, hours: '10:00 - 18:00', active: true, isPrimary: false,
    } })
    try {
      await prisma.vehicle.update({ where: { id: vehicleId }, data: { showroomId: foreignDeliveryShowroom.id } })
      expect((await listDeliveryCases(operations)).some((entry) => entry.id === deliveryCaseId)).toBe(false)
      expect(await transitionDeliveryCase(deliveryCaseId, operations, {
        version: openedDelivery.data.version, status: DeliveryCaseStatus.CANCELLED,
      })).toEqual({ type: 'not-available' })
    } finally {
      await prisma.vehicle.update({ where: { id: vehicleId }, data: { showroomId } })
      await prisma.showroom.delete({ where: { id: foreignDeliveryShowroom.id } })
    }
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
    const firstServiceDue = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    const afterSalesTask = await createAfterSalesTask({ deliveryCaseId, type: AfterSalesTaskType.FIRST_SERVICE, dueAt: firstServiceDue }, operations)
    expect(afterSalesTask.type).toBe('created')
    if (afterSalesTask.type !== 'created') return
    afterSalesTaskIds.push(afterSalesTask.data.id)
    expect((await listAfterSalesTasks(operations)).some((task) => task.id === afterSalesTask.data.id)).toBe(true)
    expect(await createAfterSalesTask({ deliveryCaseId, type: AfterSalesTaskType.FIRST_SERVICE, dueAt: firstServiceDue }, operations)).toMatchObject({ type: 'already-scheduled' })
    const foreignP13Showroom = await prisma.showroom.create({ data: {
      name: `Fictional Foreign P13 ${suffix}`, address: 'Synthetic Test Road, 5', city: 'Test City',
      state: 'Test State', postalCode: '000005', phone: 'Synthetic only',
      email: `p13-foreign-${suffix}@car-dealership.test`, hours: '10:00 - 18:00', active: true, isPrimary: false,
    } })
    try {
      await prisma.vehicle.update({ where: { id: vehicleId }, data: { showroomId: foreignP13Showroom.id } })
      expect((await listAfterSalesTasks(operations)).some((task) => task.id === afterSalesTask.data.id)).toBe(false)
      expect(await completeAfterSalesTask(afterSalesTask.data.id, 1, operations)).toMatchObject({ type: 'not-available' })
    } finally {
      await prisma.vehicle.update({ where: { id: vehicleId }, data: { showroomId } })
      await prisma.showroom.delete({ where: { id: foreignP13Showroom.id } })
    }
    expect(await completeAfterSalesTask(afterSalesTask.data.id, 1, operations)).toMatchObject({ type: 'completed' })
    const customerPurchases = await listCustomerPurchases(customer.id)
    expect(customerPurchases).toHaveLength(1)
    expect(customerPurchases[0]).toMatchObject({ referenceNumber: opened.data.referenceNumber, status: SalesDealStatus.WON,
      deliveryCase: { status: DeliveryCaseStatus.HANDED_OVER, afterSalesTasks: [{ status: 'COMPLETED' }] } })
    expect(customerPurchases[0]).not.toHaveProperty('quoteDraft')
    expect(await listCustomerPurchases(otherCustomer.id)).toHaveLength(0)
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
    const foreignP11Showroom = await prisma.showroom.create({ data: {
      name: `Fictional Foreign P11 ${suffix}`, address: 'Synthetic Test Road, 3', city: 'Test City',
      state: 'Test State', postalCode: '000003', phone: 'Synthetic only',
      email: `p11-foreign-${suffix}@car-dealership.test`, hours: '10:00 - 18:00', active: true, isPrimary: false,
    } })
    try {
      await prisma.vehicle.update({ where: { id: vehicleId }, data: { showroomId: foreignP11Showroom.id } })
      expect((await listWorkshopOrders(workshop)).some((order) => order.id === openedWorkshop.data.id)).toBe(false)
      const item = openedWorkshop.data.checklist[0]
      expect(await updateWorkshopChecklist(openedWorkshop.data.id, workshop, {
        code: item.code, completed: true, version: item.version,
      })).toMatchObject({ type: 'not-available' })
    } finally {
      await prisma.vehicle.update({ where: { id: vehicleId }, data: { showroomId } })
      await prisma.showroom.delete({ where: { id: foreignP11Showroom.id } })
    }
    expect((await listWorkshopOrders(workshop)).some((order) => order.id === openedWorkshop.data.id)).toBe(true)
    const scheduled = await transitionWorkshopOrder(openedWorkshop.data.id, workshop, { version: 1, status: WorkshopOrderStatus.SCHEDULED })
    expect(scheduled.type).toBe('updated')
    const started = await transitionWorkshopOrder(openedWorkshop.data.id, workshop, { version: 2, status: WorkshopOrderStatus.IN_PROGRESS })
    expect(started.type).toBe('updated')
    expect(await transitionWorkshopOrder(openedWorkshop.data.id, workshop, { version: 3, status: WorkshopOrderStatus.COMPLETED })).toMatchObject({ type: 'checks-incomplete' })
    const part = await createPartAndReceive({ sku: `P12-${suffix}`, name: 'Fictional filter', unit: 'each', showroomId, quantity: '2', reason: 'Synthetic integration test opening stock' }, partsManager)
    expect(part.type).toBe('created')
    if (part.type !== 'created') return
    partIds.push(part.data.id)
    const requested = await createWorkshopPartRequest({ workshopOrderId: openedWorkshop.data.id, partId: part.data.id, quantity: '1' }, workshop)
    expect(requested.type).toBe('requested')
    if (requested.type !== 'requested') return
    partRequestIds.push(requested.data.id)
    const foreignP12Showroom = await prisma.showroom.create({ data: {
      name: `Fictional Foreign P12 ${suffix}`, address: 'Synthetic Test Road, 4', city: 'Test City',
      state: 'Test State', postalCode: '000004', phone: 'Synthetic only',
      email: `p12-foreign-${suffix}@car-dealership.test`, hours: '10:00 - 18:00', active: true, isPrimary: false,
    } })
    try {
      await prisma.vehicle.update({ where: { id: vehicleId }, data: { showroomId: foreignP12Showroom.id } })
      expect((await listWorkshopPartRequests(partsManager)).some((entry) => entry.id === requested.data.id)).toBe(false)
      expect(await issueWorkshopPartRequest({ id: requested.data.id, version: 1 }, partsManager)).toMatchObject({ type: 'not-available' })
    } finally {
      await prisma.vehicle.update({ where: { id: vehicleId }, data: { showroomId } })
      await prisma.showroom.delete({ where: { id: foreignP12Showroom.id } })
    }
    expect((await listWorkshopPartRequests(partsManager)).some((entry) => entry.id === requested.data.id)).toBe(true)
    expect(await issueWorkshopPartRequest({ id: requested.data.id, version: 1 }, partsManager)).toMatchObject({ type: 'issued' })
    const excess = await createWorkshopPartRequest({ workshopOrderId: openedWorkshop.data.id, partId: part.data.id, quantity: '3' }, workshop)
    expect(excess.type).toBe('requested')
    if (excess.type !== 'requested') return
    partRequestIds.push(excess.data.id)
    expect(await issueWorkshopPartRequest({ id: excess.data.id, version: 1 }, partsManager)).toMatchObject({ type: 'insufficient-stock' })
    expect((await listParts(workshop)).stocks.find((stock) => stock.partId === part.data.id)?.quantity).toBe('1')
    for (const item of openedWorkshop.data.checklist) {
      expect(await updateWorkshopChecklist(openedWorkshop.data.id, workshop, { code: item.code, completed: true, version: item.version })).toMatchObject({ type: 'updated' })
    }
    const beforeComplete = await prisma.workshopOrder.findUniqueOrThrow({ where: { id: openedWorkshop.data.id }, select: { version: true } })
    expect(await transitionWorkshopOrder(openedWorkshop.data.id, workshop, { version: beforeComplete.version, status: WorkshopOrderStatus.COMPLETED })).toMatchObject({ type: 'updated' })
    expect((await prisma.vehicle.findUniqueOrThrow({ where: { id: vehicleId }, select: { status: true } })).status).toBe(VehicleStatus.SOLD)
    const analytics = await getShowroomAnalytics(operations)
    expect(analytics.periodDays).toBe(30)
    expect(analytics.salesDeals.find((entry) => entry.status === SalesDealStatus.WON)?.count).toBe(1)
    expect(analytics.deliveries.find((entry) => entry.status === DeliveryCaseStatus.HANDED_OVER)?.count).toBe(1)
    expect(analytics.workshopOrders.find((entry) => entry.status === WorkshopOrderStatus.COMPLETED)?.count).toBe(1)
    expect(analytics.afterSalesTasks.find((entry) => entry.status === 'COMPLETED')?.count).toBe(1)
    expect(JSON.stringify(analytics)).not.toContain(customer.email)
    const foreignP17Showroom = await prisma.showroom.create({ data: {
      name: `Fictional Foreign P17 ${suffix}`, address: 'Synthetic Test Road, 6', city: 'Test City',
      state: 'Test State', postalCode: '000006', phone: 'Synthetic only',
      email: `p17-foreign-${suffix}@car-dealership.test`, hours: '10:00 - 18:00', active: true, isPrimary: false,
    } })
    try {
      await prisma.vehicle.update({ where: { id: vehicleId }, data: { showroomId: foreignP17Showroom.id } })
      const mismatchedAnalytics = await getShowroomAnalytics(operations)
      expect(mismatchedAnalytics.salesDeals).toEqual([])
      expect(mismatchedAnalytics.deliveries).toEqual([])
      expect(mismatchedAnalytics.workshopOrders).toEqual([])
      expect(mismatchedAnalytics.afterSalesTasks).toEqual([])
    } finally {
      await prisma.vehicle.update({ where: { id: vehicleId }, data: { showroomId } })
      await prisma.showroom.delete({ where: { id: foreignP17Showroom.id } })
    }
    const unassignedOperations = await prisma.user.create({ data: {
      email: `p17-no-showroom-${suffix}@car-dealership.test`, name: 'Fictional Unassigned Operations',
      role: UserRole.OPERATIONS, status: UserStatus.ACTIVE, emailVerified: new Date(),
    } })
    userIds.push(unassignedOperations.id)
    const emptyAnalytics = await getShowroomAnalytics(unassignedOperations)
    expect(emptyAnalytics.salesDeals).toEqual([])
    expect(emptyAnalytics.deliveries).toEqual([])
    expect(emptyAnalytics.workshopOrders).toEqual([])
    expect(emptyAnalytics.afterSalesTasks).toEqual([])

  })

  it('hides deals and finance records whose linked inquiry belongs to another showroom', async () => {
    const database = new URL(process.env.DATABASE_URL ?? 'postgresql://invalid/invalid')
    if (process.env.APP_ENV !== 'test' || !['localhost', '127.0.0.1', '::1'].includes(database.hostname) ||
      database.pathname !== '/car_dealership_test') {
      throw new Error('Showroom isolation tests only run against the isolated loopback CI database.')
    }

    const testKey = `scope-mismatch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const previousPaymentMode = process.env.PAYMENT_MODE
    let mainShowroomId: string | undefined
    let foreignShowroomId: string | undefined
    let vehicleId: string | undefined
    let inquiryId: string | undefined
    let quoteId: string | undefined
    let dealId: string | undefined
    let invoiceId: string | undefined
    let salesId: string | undefined
    let financeId: string | undefined
    let mismatchedDeliveryCaseId: string | undefined
    let mismatchedAfterSalesTaskId: string | undefined

    try {
      const referenceVehicle = await prisma.vehicle.findFirstOrThrow({ select: { brandId: true, bodyTypeId: true } })
      const mainShowroom = await prisma.showroom.create({ data: {
        name: `Fictional Scope Main ${testKey}`, address: 'Synthetic Test Road, 7', city: 'Test City',
        state: 'Test State', postalCode: '000007', phone: 'Synthetic only',
        email: `scope-main-${testKey}@car-dealership.test`, hours: '10:00 - 18:00', active: true, isPrimary: false,
      } })
      mainShowroomId = mainShowroom.id
      const foreignShowroom = await prisma.showroom.create({ data: {
        name: `Fictional Scope Foreign ${testKey}`, address: 'Synthetic Test Road, 8', city: 'Test City',
        state: 'Test State', postalCode: '000008', phone: 'Synthetic only',
        email: `scope-foreign-${testKey}@car-dealership.test`, hours: '10:00 - 18:00', active: true, isPrimary: false,
      } })
      foreignShowroomId = foreignShowroom.id

      const sales = await prisma.user.create({ data: {
        email: `scope-sales-${testKey}@car-dealership.test`, name: 'Fictional Scope Sales',
        role: UserRole.SALES, status: UserStatus.ACTIVE, emailVerified: new Date(),
      } })
      salesId = sales.id
      const finance = await prisma.user.create({ data: {
        email: `scope-finance-${testKey}@car-dealership.test`, name: 'Fictional Scope Finance',
        role: UserRole.FINANCE, status: UserStatus.ACTIVE, emailVerified: new Date(),
      } })
      financeId = finance.id
      await prisma.showroomStaffAssignment.createMany({ data: [
        { userId: sales.id, showroomId: mainShowroom.id },
        { userId: finance.id, showroomId: mainShowroom.id },
      ], skipDuplicates: true })

      const vehicle = await prisma.vehicle.create({ data: {
        ...referenceVehicle, slug: testKey, stockNumber: testKey.toUpperCase(),
        model: 'Fictional Sedan', variant: 'Scope mismatch test', shortTitle: 'Synthetic Main Showroom Vehicle',
        year: 2024, price: 2_000_000, mileage: 10000, fuelType: 'Petrol', transmission: 'Automatic',
        shortDescription: 'Synthetic vehicle for an isolated scope regression.',
        description: 'Fictional data used only in the isolated test database.',
        status: VehicleStatus.AVAILABLE, published: true, showroomId: mainShowroom.id,
      } })
      vehicleId = vehicle.id
      const inquiry = await prisma.inquiry.create({ data: {
        referenceNumber: `SCOPE-${testKey}`, showroomId: foreignShowroom.id, vehicleId: vehicle.id,
        userId: null, assignedToId: null, fullName: 'Fictional Foreign Showroom Customer',
        phone: '0000000000', email: `customer-${testKey}@car-dealership.test`,
        message: 'Synthetic request; no external contact.', consentAccepted: false, status: InquiryStatus.IN_PROGRESS,
      } })
      inquiryId = inquiry.id
      const quote = await prisma.salesQuoteDraft.create({ data: {
        inquiryId: inquiry.id, vehicleId: vehicle.id, createdById: sales.id, vehiclePrice: vehicle.price,
        discountAmount: 0, estimatedOtherFees: 0, estimatedSubtotal: vehicle.price, currency: 'INR',
      } })
      quoteId = quote.id

      expect((await createSalesDeal(inquiry.id, sales, quote.id)).type).toBe('not-found')
      const deal = await prisma.salesDeal.create({ data: {
        referenceNumber: `DEAL-${testKey}`, inquiryId: inquiry.id, quoteDraftId: quote.id,
        vehicleId: vehicle.id, showroomId: mainShowroom.id, assignedToId: null, createdById: sales.id,
        status: SalesDealStatus.WON, acceptanceMethod: SalesDealAcceptanceMethod.CUSTOMER_EMAIL,
      } })
      dealId = deal.id
      const invoice = await prisma.salesInvoiceDraft.create({ data: {
        referenceNumber: `DRAFT-${testKey}`, dealId: deal.id, createdById: finance.id,
        vehicleTitle: 'Synthetic main showroom vehicle', stockNumber: testKey.toUpperCase(),
        vehiclePrice: vehicle.price, discountAmount: 0, estimatedOtherFees: 0,
        estimatedSubtotal: vehicle.price, currency: 'INR',
      } })
      invoiceId = invoice.id

      expect((await listEligibleDealsForDelivery(sales)).some((item) => item.id === deal.id)).toBe(false)
      expect(await createDeliveryCase(deal.id, sales)).toEqual({ type: 'not-available' })

      const mismatchedDeliveryCase = await prisma.deliveryCase.create({ data: {
        referenceNumber: `DLV-${testKey}`, dealId: deal.id, vehicleId: vehicle.id,
        showroomId: mainShowroom.id, assignedToId: sales.id, createdById: sales.id,
        status: DeliveryCaseStatus.HANDED_OVER,
      } })
      mismatchedDeliveryCaseId = mismatchedDeliveryCase.id
      const mismatchedTask = await prisma.afterSalesTask.create({ data: {
        deliveryCaseId: mismatchedDeliveryCase.id, showroomId: mainShowroom.id,
        type: AfterSalesTaskType.FIRST_SERVICE, dueAt: new Date(Date.now() + 86_400_000),
        assignedToId: sales.id, createdById: sales.id,
      } })
      mismatchedAfterSalesTaskId = mismatchedTask.id
      expect((await listDeliveryCases(sales)).some((item) => item.id === mismatchedDeliveryCase.id)).toBe(false)
      expect((await listAfterSalesTasks(sales)).some((item) => item.id === mismatchedTask.id)).toBe(false)

      expect(await getSalesQuoteDrafts(inquiry.id, sales)).toBeNull()
      expect(await getSalesDeal(deal.id, sales)).toBeNull()
      expect((await listSalesDeals(sales)).some((item) => item.id === deal.id)).toBe(false)
      expect((await listWonSalesDealsForFinance(finance)).some((item) => item.id === deal.id)).toBe(false)
      expect((await listSalesInvoiceDrafts(finance)).some((item) => item.id === invoice.id)).toBe(false)
      expect(await createSalesInvoiceDraft(deal.id, finance)).toEqual({ type: 'not-available' })

      process.env.PAYMENT_MODE = 'sandbox'
      expect(await runPaymentSandboxSimulation(invoice.id, finance, {
        idempotencyKey: `sandbox-${testKey}`, outcome: 'APPROVED',
      })).toEqual({ type: 'not-available' })
    } finally {
      if (previousPaymentMode === undefined) delete process.env.PAYMENT_MODE
      else process.env.PAYMENT_MODE = previousPaymentMode
      if (mismatchedAfterSalesTaskId) await prisma.afterSalesTask.deleteMany({ where: { id: mismatchedAfterSalesTaskId } })
      if (mismatchedDeliveryCaseId) await prisma.deliveryCase.deleteMany({ where: { id: mismatchedDeliveryCaseId } })
      if (invoiceId) await prisma.salesInvoiceDraft.deleteMany({ where: { id: invoiceId } })
      if (dealId) await prisma.salesDeal.deleteMany({ where: { id: dealId } })
      if (quoteId) await prisma.salesQuoteDraft.deleteMany({ where: { id: quoteId } })
      if (inquiryId) await prisma.inquiry.deleteMany({ where: { id: inquiryId } })
      if (vehicleId) await prisma.vehicle.deleteMany({ where: { id: vehicleId } })
      if (salesId || financeId) {
        const userIds = [salesId, financeId].filter((id): id is string => Boolean(id))
        await prisma.showroomStaffAssignment.deleteMany({ where: { userId: { in: userIds } } })
        await prisma.user.deleteMany({ where: { id: { in: userIds } } })
      }
      if (foreignShowroomId) await prisma.showroom.deleteMany({ where: { id: foreignShowroomId } })
      if (mainShowroomId) await prisma.showroom.deleteMany({ where: { id: mainShowroomId } })
    }
  })
})
