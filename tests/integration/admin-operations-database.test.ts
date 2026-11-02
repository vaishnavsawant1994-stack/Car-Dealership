import 'dotenv/config'
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { UserRole, VehicleStatus } from '@prisma/client'
import { addLeadMessage, assignLead } from '@/lib/admin/lead-service'
import { createSellValuation, saveSellInspection, scheduleTestDrive } from '@/lib/admin/specialist-workflows'
import { getPublicationReadiness } from '@/lib/admin/vehicle-workflow'
import { prisma } from '@/lib/db/prisma'
import { createReferenceNumber } from '@/lib/references'
import { resolvePublicVehicleSlug } from '@/lib/repositories/vehicle-repository'

const ids = { inquiries: [] as string[], drives: [] as string[], sells: [] as string[], vehicles: [] as string[], contacts: [] as string[] }
let originalContactCounter: number | null = null
const ref = (kind: string) => `OA-${kind}-TEST-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

afterEach(async () => {
  const resources = [...ids.inquiries.map((id) => ['Inquiry', id]), ...ids.drives.map((id) => ['TestDrive', id]), ...ids.sells.map((id) => ['SellRequest', id])] as Array<[string, string]>
  if (resources.length) {
    await prisma.operationalMessage.deleteMany({ where: { OR: resources.map(([resourceType, resourceId]) => ({ resourceType, resourceId })) } })
    await prisma.operationalActivity.deleteMany({ where: { OR: resources.map(([resourceType, resourceId]) => ({ resourceType, resourceId })) } })
  }
  await prisma.inquiry.deleteMany({ where: { id: { in: ids.inquiries.splice(0) } } })
  await prisma.testDrive.deleteMany({ where: { id: { in: ids.drives.splice(0) } } })
  await prisma.sellRequest.deleteMany({ where: { id: { in: ids.sells.splice(0) } } })
  await prisma.vehicle.deleteMany({ where: { id: { in: ids.vehicles.splice(0) } } })
  await prisma.contactMessage.deleteMany({ where: { id: { in: ids.contacts.splice(0) } } })
  if (originalContactCounter !== null) {
    await prisma.referenceCounter.update({ where: { key: 'CON' }, data: { value: originalContactCounter } })
    originalContactCounter = null
  }
})
afterAll(async () => prisma.$disconnect())

describe('admin operations against PostgreSQL', () => {
  it('contains deterministic staff identities for every operational role', async () => {
    const staff = await prisma.user.findMany({ where: { email: { endsWith: '@deccanwheels.local' }, role: { not: UserRole.CUSTOMER } }, include: { adminPreferences: true } })
    expect(new Set(staff.map((item) => item.role))).toEqual(new Set([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SALES, UserRole.OPERATIONS, UserRole.CONTENT_MANAGER]))
    expect(staff.every((item) => item.adminPreferences)).toBe(true)
  })

  it('creates a complete draft, publishes it and preserves an old slug redirect', async () => {
    const source = await prisma.vehicle.findFirstOrThrow({ select: { brandId: true, bodyTypeId: true } })
    const slug = `admin-integration-${Date.now()}`
    const vehicle = await prisma.vehicle.create({ data: { showroomId: (await prisma.showroom.findFirstOrThrow({ where: { active: true, isPrimary: true }, select: { id: true } })).id, brandId: source.brandId, bodyTypeId: source.bodyTypeId, model: 'Integration', variant: 'Workflow', stockNumber: `TEST-${Date.now()}`, slug, shortTitle: 'Integration Workflow', year: 2024, price: 4_000_000, mileage: 5000, fuelType: 'Petrol', transmission: 'Automatic', shortDescription: 'A complete integration vehicle for workflow checks.', description: 'A complete integration vehicle used only while the automated admin workflow test is running.', status: VehicleStatus.AVAILABLE, images: { create: [0, 1, 2].map((sortOrder) => ({ url: `/test/${sortOrder}.webp`, altText: `Integration vehicle ${sortOrder}`, category: sortOrder === 2 ? 'INTERIOR' : 'EXTERIOR', isPrimary: sortOrder === 0, sortOrder })) } }, include: { images: true } })
    ids.vehicles.push(vehicle.id)
    expect(getPublicationReadiness(vehicle).ready).toBe(true)
    const nextSlug = `${slug}-renamed`
    await prisma.$transaction([prisma.vehicle.update({ where: { id: vehicle.id }, data: { slug: nextSlug, published: true, publishedAt: new Date() } }), prisma.vehicleSlugRedirect.create({ data: { vehicleId: vehicle.id, fromSlug: slug, toSlug: nextSlug } })])
    const resolved = await resolvePublicVehicleSlug(slug)
    expect(resolved?.vehicle.slug).toBe(nextSlug)
    expect(resolved?.redirectedFrom).toBe(slug)
  })

  it('assigns an enquiry and keeps internal notes out of the customer account', async () => {
    const [customer, sales, superAdmin, vehicle] = await Promise.all([prisma.user.findUniqueOrThrow({ where: { email: 'customer@deccanwheels.local' } }), prisma.user.findUniqueOrThrow({ where: { email: 'sales@deccanwheels.local' } }), prisma.user.findUniqueOrThrow({ where: { email: 'superadmin@deccanwheels.local' } }), prisma.vehicle.findFirstOrThrow()])
    const inquiry = await prisma.inquiry.create({ data: { referenceNumber: ref('ENQ'), showroomId: vehicle.showroomId, userId: customer.id, vehicleId: vehicle.id, fullName: customer.name ?? 'Customer', phone: customer.phone ?? '9876543210', email: customer.email, message: 'Integration admin assignment request.' } }); ids.inquiries.push(inquiry.id)
    const assigned = await assignLead('enquiries', inquiry.id, superAdmin, sales.id, inquiry.version)
    expect(assigned?.assignedToId).toBe(sales.id)
    await addLeadMessage('enquiries', inquiry.id, sales, { body: 'Private operational note.', customerVisible: false, type: 'INTERNAL_NOTE' })
    await addLeadMessage('enquiries', inquiry.id, sales, { body: 'Visible customer update.', customerVisible: true, type: 'CUSTOMER_MESSAGE' })
    const customerMessages = await prisma.customerEngagementMessage.findMany({ where: { inquiryId: inquiry.id } })
    expect(customerMessages.map((item) => item.body)).toEqual(['Visible customer update.'])
  })

  it('confirms a test drive and blocks a conflicting slot for the same vehicle', async () => {
    const [customer, sales, vehicle] = await Promise.all([prisma.user.findUniqueOrThrow({ where: { email: 'customer@deccanwheels.local' } }), prisma.user.findUniqueOrThrow({ where: { email: 'sales@deccanwheels.local' } }), prisma.vehicle.findFirstOrThrow()])
    const preferredDate = new Date(Date.now() + 10 * 86_400_000)
    const create = () => prisma.testDrive.create({ data: { referenceNumber: ref('TD'), showroomId: vehicle.showroomId, userId: customer.id, vehicleId: vehicle.id, fullName: customer.name ?? 'Customer', phone: customer.phone ?? '9876543210', email: customer.email, preferredDate, preferredTime: '14:30', assignedToId: sales.id } })
    const first = await create(); const second = await create(); ids.drives.push(first.id, second.id)
    expect((await scheduleTestDrive(first.id, sales, { confirmedDate: preferredDate, confirmedTime: '14:30', version: first.version }, 'confirm')).type).toBe('success')
    expect((await scheduleTestDrive(second.id, sales, { confirmedDate: preferredDate, confirmedTime: '14:30', version: second.version }, 'confirm')).type).toBe('slot-conflict')
  })

  it('moves a sell request through inspection, valuation and offer creation', async () => {
    const [operations, showroom] = await Promise.all([prisma.user.findUniqueOrThrow({ where: { email: 'operations@deccanwheels.local' } }), prisma.showroom.findFirstOrThrow({ where: { active: true, isPrimary: true }, select: { id: true } })])
    const sell = await prisma.sellRequest.create({ data: { referenceNumber: ref('SELL'), showroomId: showroom.id, name: 'Integration Seller', email: 'integration-seller@example.com', phone: '9876543210', make: 'BMW', model: 'X5', year: 2021, mileage: 25000, city: 'Pune', status: 'SUBMITTED', assignedToId: operations.id } }); ids.sells.push(sell.id)
    const inspection = await saveSellInspection(sell.id, operations, { documentsVerified: true, serviceHistoryVerified: true, exteriorScore: 8, interiorScore: 8, mechanicalScore: 9, overallConditionScore: 8, customerSummary: 'Well maintained.' })
    expect(inspection?.completedAt).toBeInstanceOf(Date)
    const valuation = await createSellValuation(sell.id, operations, { marketMinimum: 4_000_000, marketMaximum: 4_800_000, recommendedOffer: 4_400_000, finalOffer: 4_350_000, validUntil: new Date(Date.now() + 7 * 86_400_000) })
    expect(valuation?.finalOffer).toBe(4_350_000)
    await expect(prisma.sellRequest.findUniqueOrThrow({ where: { id: sell.id } })).resolves.toMatchObject({ status: 'OFFER_MADE' })
  })

  it('keeps published content, notifications and audit records database backed', async () => {
    const [content, notifications, audits] = await Promise.all([prisma.contentBlock.count({ where: { status: 'PUBLISHED' } }), prisma.adminNotification.count(), prisma.auditLog.count()])
    expect(content).toBeGreaterThan(0); expect(notifications).toBeGreaterThan(0); expect(audits).toBeGreaterThan(0)
  })

  it('advances past an existing reference when a persisted counter is stale', async () => {
    const counter = await prisma.referenceCounter.findUniqueOrThrow({ where: { key: 'CON' } })
    originalContactCounter = counter.value
    await prisma.referenceCounter.update({ where: { key: 'CON' }, data: { value: 900000 } })
    const existing = await prisma.contactMessage.create({
      data: {
        referenceNumber: `OA-CON-${new Date().getFullYear()}-900001`,
        name: 'Reference Collision Test',
        phone: '9876543210',
        email: 'reference-collision@example.com',
        message: 'Temporary integration record.',
      },
    })
    ids.contacts.push(existing.id)
    await expect(createReferenceNumber('CON')).resolves.toBe(`OA-CON-${new Date().getFullYear()}-900002`)
  })
})
