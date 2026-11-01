import { readFile, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, test, type APIResponse, type Browser, type Page } from '@playwright/test'
import { createScriptPrismaClient } from '../../scripts/script-prisma'

const prisma = createScriptPrismaClient()
const password = process.env.SEED_ADMIN_PASSWORD as string | undefined
if (!password) throw new Error('Set SEED_ADMIN_PASSWORD in the ignored local .env file before running E2E tests.')
const seedPassword = password as string
test.describe.configure({ timeout: 90_000 })
const created = {
  vehicles: [] as string[],
  inquiries: [] as string[],
  testDrives: [] as string[],
  sellRequests: [] as string[],
  testimonials: [] as string[],
  gallery: [] as string[],
  invitations: [] as string[],
  users: [] as string[],
  resources: [] as Array<{ resourceType: string; resourceId: string }>,
}
let contactSetting: { id: string; value: string; version: number } | null = null

async function signIn(page: Page, email = 'admin@deccanwheels.local') {
  await page.goto('/login?callbackUrl=%2Fadmin')
  const form = page.locator('.auth-form').first()
  await form.getByLabel('Email address').fill(email)
  await form.getByLabel('Password', { exact: true }).fill(seedPassword)
  await form.getByRole('button', { name: /^sign in/i }).click()
  await expect.poll(async () => /\/admin(?:\?.*)?$/.test(page.url()) || await page.getByRole('button', { name: 'Open customer account menu' }).count() > 0, { timeout: 30_000 }).toBe(true)
  if (!/\/admin(?:\?.*)?$/.test(page.url())) await page.goto('/admin')
  await expect(page).toHaveURL(/\/admin(?:\?.*)?$/, { timeout: 30_000 })
}

async function json<T>(response: APIResponse, status = 200) {
  const body = await response.json()
  expect(response.status(), JSON.stringify(body)).toBe(status)
  return body as T
}

async function customerPage(browser: Browser, route: string) {
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto('/login?callbackUrl=%2Faccount')
  const form = page.locator('.auth-form').first()
  await form.getByLabel('Email address').fill('customer@deccanwheels.local')
  await form.getByLabel('Password', { exact: true }).fill(seedPassword)
  await form.getByRole('button', { name: /^sign in/i }).click()
  await expect.poll(async () => /\/account(?:\?.*)?$/.test(page.url()) || await page.getByRole('button', { name: 'Open customer account menu' }).count() > 0, { timeout: 30_000 }).toBe(true)
  if (!/\/account(?:\?.*)?$/.test(page.url())) await page.goto('/account')
  await expect(page).toHaveURL(/\/account(?:\?.*)?$/, { timeout: 30_000 })
  await page.waitForLoadState('networkidle').catch(() => undefined)
  try {
    await page.goto(route, { waitUntil: 'domcontentloaded' })
  } catch {
    await page.waitForTimeout(750)
    await page.goto(route, { waitUntil: 'domcontentloaded' })
  }
  return { context, page }
}

test.afterAll(async () => {
  if (contactSetting) {
    await prisma.siteSetting.update({ where: { id: contactSetting.id }, data: { value: contactSetting.value, version: contactSetting.version } })
  }
  if (created.resources.length) {
    await prisma.operationalMessage.deleteMany({ where: { OR: created.resources } })
    await prisma.operationalActivity.deleteMany({ where: { OR: created.resources } })
    await prisma.operationalFollowUp.deleteMany({ where: { OR: created.resources } })
  }
  await prisma.inquiry.deleteMany({ where: { id: { in: created.inquiries } } })
  await prisma.testDrive.deleteMany({ where: { id: { in: created.testDrives } } })
  await prisma.sellRequest.deleteMany({ where: { id: { in: created.sellRequests } } })
  await prisma.testimonial.deleteMany({ where: { id: { in: created.testimonials } } })
  await prisma.galleryItem.deleteMany({ where: { id: { in: created.gallery } } })
  await prisma.staffInvitation.deleteMany({ where: { id: { in: created.invitations } } })
  await prisma.user.deleteMany({ where: { id: { in: created.users } } })
  for (const vehicleId of created.vehicles) {
    await prisma.vehicle.deleteMany({ where: { id: vehicleId } })
    const uploadRoot = resolve(process.cwd(), 'public', 'uploads', 'vehicles', vehicleId)
    const expectedRoot = resolve(process.cwd(), 'public', 'uploads', 'vehicles')
    if (uploadRoot.startsWith(`${expectedRoot}\\`)) await rm(uploadRoot, { recursive: true, force: true })
  }
  await prisma.$disconnect()
})

test('admin completes the draft, image, publication and vehicle-status lifecycle', async ({ page }) => {
  await signIn(page)
  const [brand, bodyType] = await Promise.all([
    prisma.brand.findUniqueOrThrow({ where: { slug: 'mercedes-benz' } }),
    prisma.bodyType.findUniqueOrThrow({ where: { slug: 'sedan' } }),
  ])
  const unique = Date.now()
  const slug = `2025-mercedes-benz-e-class-admin-${unique}`
  const draft = await json<{ data: { id: string; version: number } }>(await page.request.post('/api/admin/vehicles', {
    data: {
      brandId: brand.id,
      bodyTypeId: bodyType.id,
      model: 'E-Class',
      variant: 'Admin Workflow',
      stockNumber: `E2E-${unique}`,
      slug,
      shortTitle: 'Mercedes-Benz E-Class Admin Workflow',
      year: 2025,
      price: 5_500_000,
      currency: 'INR',
      mileage: 9000,
      fuelType: 'Diesel',
      transmission: 'Automatic',
      shortDescription: 'A complete temporary vehicle used to validate the secure admin workflow.',
      description: 'A complete temporary Mercedes-Benz vehicle record used by Playwright to validate creation, publication and operational status transitions.',
      status: 'AVAILABLE',
      featured: false,
      newArrival: true,
      certified: true,
      featureIds: [],
      version: 1,
    },
  }), 201)
  created.vehicles.push(draft.data.id)
  created.resources.push({ resourceType: 'Vehicle', resourceId: draft.data.id })

  const incomplete = await page.request.post(`/api/admin/vehicles/${draft.data.id}/publish`)
  expect(incomplete.status()).toBe(422)
  await expect(incomplete.json()).resolves.toMatchObject({ error: { code: 'NOT_READY' } })

  const imageFiles = [
    ['workflow-bmw.webp', 'public/images/hero/hero-bmw-5-series.webp'],
    ['workflow-audi.webp', 'public/images/hero/hero-audi-rs7.webp'],
    ['workflow-mercedes.webp', 'public/images/hero/hero-mercedes-s-class.webp'],
  ] as const
  const imageIds: string[] = []
  for (const [name, path] of imageFiles) {
    const uploaded = await json<{ data: { id: string } }>(await page.request.post(`/api/admin/vehicles/${draft.data.id}/images`, {
      multipart: {
        file: { name, mimeType: 'image/webp', buffer: await readFile(resolve(process.cwd(), path)) },
        category: 'EXTERIOR',
        altText: `${name.replace('.webp', '')} exterior`,
        isPrimary: String(imageIds.length === 0),
      },
    }), 201)
    imageIds.push(uploaded.data.id)
  }
  await json(await page.request.patch(`/api/admin/vehicles/${draft.data.id}/images`, {
    data: { images: imageIds.map((id, index) => ({ id, sortOrder: imageIds.length - index, isPrimary: index === 1 })) },
  }))

  const available = await json<{ data: { version: number } }>(await page.request.post(`/api/admin/vehicles/${draft.data.id}/status`, { data: { status: 'AVAILABLE', version: draft.data.version } }))
  const published = await json<{ data: { version: number } }>(await page.request.post(`/api/admin/vehicles/${draft.data.id}/publish`))
  await page.goto(`/inventory/${slug}`)
  await expect(page.locator('h1')).toHaveText('Mercedes-Benz E-Class')
  await expect(page.getByText('Admin Workflow', { exact: true })).toBeVisible()

  const reserved = await json<{ data: { version: number } }>(await page.request.post(`/api/admin/vehicles/${draft.data.id}/status`, { data: { status: 'RESERVED', version: published.data.version } }))
  await page.reload()
  await expect(page.locator('.vehicle-status')).toHaveText('Reserved')
  const sold = await json<{ data: { version: number } }>(await page.request.post(`/api/admin/vehicles/${draft.data.id}/status`, { data: { status: 'SOLD', version: reserved.data.version, reason: 'Completed end-to-end test sale.' } }))
  await page.reload()
  await expect(page.locator('.vehicle-status')).toHaveText('Sold')
  await expect(page.getByText('This vehicle has been sold.')).toBeVisible()
  await json(await page.request.post(`/api/admin/vehicles/${draft.data.id}/status`, { data: { status: 'ARCHIVED', version: sold.data.version, reason: 'End-to-end test cleanup.' } }))
  expect((await page.request.get(`/api/vehicles/${slug}`)).status()).toBe(404)
  expect(available.data.version).toBeGreaterThan(draft.data.version)
})

test('enquiry assignment keeps internal notes private and publishes customer updates', async ({ page, browser }) => {
  await signIn(page)
  const [customer, sales, vehicle] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { email: 'customer@deccanwheels.local' } }),
    prisma.user.findUniqueOrThrow({ where: { email: 'sales@deccanwheels.local' } }),
    prisma.vehicle.findFirstOrThrow({ where: { published: true } }),
  ])
  const referenceNumber = `OA-ENQ-E2E-${Date.now()}`
  const inquiry = await prisma.inquiry.create({ data: { referenceNumber, userId: customer.id, vehicleId: vehicle.id, fullName: customer.name ?? 'Demo Customer', phone: customer.phone ?? '9876543210', email: customer.email, message: 'Temporary workflow enquiry.' } })
  created.inquiries.push(inquiry.id)
  created.resources.push({ resourceType: 'Inquiry', resourceId: inquiry.id })

  await json(await page.request.post(`/api/admin/enquiries/${inquiry.id}/assign`, { data: { assigneeId: sales.id, version: inquiry.version } }))
  await json(await page.request.post(`/api/admin/enquiries/${inquiry.id}/note`, { data: { body: 'Private stock and pricing note.', customerVisible: false, type: 'INTERNAL_NOTE' } }), 201)
  await json(await page.request.post(`/api/admin/enquiries/${inquiry.id}/message`, { data: { body: 'Your requested vehicle is ready for a showroom viewing.', customerVisible: true, type: 'CUSTOMER_MESSAGE' } }), 201)
  const messages = await prisma.customerEngagementMessage.findMany({ where: { inquiryId: inquiry.id } })
  expect(messages.map((item) => item.body)).toEqual(['Your requested vehicle is ready for a showroom viewing.'])

  const account = await customerPage(browser, `/account/enquiries/${referenceNumber}`)
  await expect(account.page.getByText('Your requested vehicle is ready for a showroom viewing.')).toBeVisible()
  await expect(account.page.getByText('Private stock and pricing note.')).toHaveCount(0)
  await account.context.close()
})

test('test drive confirmation and rescheduling reaches the customer account', async ({ page, browser }) => {
  await signIn(page)
  const [customer, sales, vehicle] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { email: 'customer@deccanwheels.local' } }),
    prisma.user.findUniqueOrThrow({ where: { email: 'sales@deccanwheels.local' } }),
    prisma.vehicle.findFirstOrThrow({ where: { published: true } }),
  ])
  const referenceNumber = `OA-TD-E2E-${Date.now()}`
  const preferredDate = new Date(Date.now() + 21 * 86_400_000)
  const drive = await prisma.testDrive.create({ data: { referenceNumber, userId: customer.id, vehicleId: vehicle.id, fullName: customer.name ?? 'Demo Customer', phone: customer.phone ?? '9876543210', email: customer.email, preferredDate, preferredTime: '10:30', assignedToId: sales.id } })
  created.testDrives.push(drive.id)
  created.resources.push({ resourceType: 'TestDrive', resourceId: drive.id })
  const confirmedDate = new Date(Date.now() + 22 * 86_400_000)
  const confirmed = await json<{ data: { version: number } }>(await page.request.post(`/api/admin/test-drives/${drive.id}/confirm`, { data: { confirmedDate: confirmedDate.toISOString(), confirmedTime: '14:30', version: drive.version, note: 'Please arrive ten minutes early.' } }))

  const account = await customerPage(browser, `/account/test-drives/${referenceNumber}`)
  await expect(account.page.getByText(/confirmed/i).first()).toBeVisible()
  await expect(account.page.getByText(/14:30/).first()).toBeVisible()
  await account.context.close()

  const rescheduledDate = new Date(Date.now() + 23 * 86_400_000)
  await json(await page.request.post(`/api/admin/test-drives/${drive.id}/reschedule`, { data: { confirmedDate: rescheduledDate.toISOString(), confirmedTime: '16:00', version: confirmed.data.version } }))
  await expect(prisma.testDrive.findUniqueOrThrow({ where: { id: drive.id } })).resolves.toMatchObject({ status: 'RESCHEDULED', confirmedTime: '16:00' })
})

test('sell request records inspection, valuation and customer offer', async ({ page }) => {
  await signIn(page)
  const operations = await prisma.user.findUniqueOrThrow({ where: { email: 'operations@deccanwheels.local' } })
  const sell = await prisma.sellRequest.create({ data: { referenceNumber: `OA-SELL-E2E-${Date.now()}`, assignedToId: operations.id, status: 'SUBMITTED', name: 'Workflow Seller', email: 'workflow-seller@example.com', phone: '9876543210', make: 'BMW', model: 'X5', year: 2022, mileage: 18000, city: 'Pune' } })
  created.sellRequests.push(sell.id)
  created.resources.push({ resourceType: 'SellRequest', resourceId: sell.id })
  await json(await page.request.post(`/api/admin/sell-requests/${sell.id}/inspection`, { data: { exteriorScore: 8, interiorScore: 9, mechanicalScore: 9, overallConditionScore: 9, documentsVerified: true, serviceHistoryVerified: true, customerSummary: 'Excellent condition.' } }))
  await json(await page.request.post(`/api/admin/sell-requests/${sell.id}/valuation`, { data: { marketMinimum: 4_000_000, marketMaximum: 4_800_000, recommendedOffer: 4_400_000, finalOffer: 4_350_000, validUntil: new Date(Date.now() + 7 * 86_400_000).toISOString(), notes: 'Temporary valuation.' } }), 201)
  const result = await prisma.sellRequest.findUniqueOrThrow({ where: { id: sell.id }, include: { inspection: true, valuations: true } })
  expect(result.status).toBe('OFFER_MADE')
  expect(result.inspection?.documentsVerified).toBe(true)
  expect(result.valuations.at(0)?.finalOffer).toBe(4_350_000)
})

test('content publishing and contact settings update public database-backed surfaces', async ({ page }) => {
  await signIn(page)
  const stamp = Date.now()
  const testimonial = await json<{ data: { id: string } }>(await page.request.post('/api/admin/testimonials', { data: { name: `Workflow Buyer ${stamp}`, rating: 5, quote: 'A verified database-backed testimonial published by the admin workflow test.', avatarUrl: '', purchase: 'Mercedes-Benz E-Class', location: 'Pune', vehicleId: null, verifiedBuyer: true, featured: false, published: true, archived: false, sortOrder: 90 } }), 201)
  created.testimonials.push(testimonial.data.id)
  const gallery = await json<{ data: { id: string } }>(await page.request.post('/api/admin/gallery', { data: { title: `Workflow Gallery ${stamp}`, imageUrl: '/images/showroom/deccan-wheels-showroom-final.png', alt: 'Workflow gallery showroom image', caption: 'Temporary published gallery record.', category: 'SHOWROOM', href: '', featured: false, published: true, sortOrder: 90 } }), 201)
  created.gallery.push(gallery.data.id)
  await expect((await page.request.get('/api/testimonials')).json()).resolves.toMatchObject({ data: expect.arrayContaining([expect.objectContaining({ id: testimonial.data.id })]) })
  await expect((await page.request.get('/api/gallery')).json()).resolves.toMatchObject({ data: expect.arrayContaining([expect.objectContaining({ id: gallery.data.id })]) })

  contactSetting = await prisma.siteSetting.findUniqueOrThrow({ where: { key: 'primary_phone' } })
  const testPhone = '+91 90000 12345'
  await json(await page.request.patch('/api/admin/settings/primary_phone', { data: { value: testPhone, version: contactSetting.version } }))
  await page.goto('/')
  await expect(page.locator('.site-footer').getByText(testPhone)).toBeVisible({ timeout: 10_000 })
})

test('staff invitation is single-use and protected super-admin access cannot be removed', async ({ page }) => {
  await signIn(page)
  const stamp = Date.now()
  const email = `workflow-staff-${stamp}@example.com`
  const invitation = await json<{ data: { id: string; previewUrl: string } }>(await page.request.post('/api/admin/users', { data: { email, role: 'SALES' } }), 201)
  created.invitations.push(invitation.data.id)
  expect(invitation.data.previewUrl).toContain('/staff-invitation?token=')
  const token = new URL(invitation.data.previewUrl, 'http://localhost').searchParams.get('token')!
  await page.context().clearCookies()
  const accepted = await json<{ data: { email: string } }>(await page.request.post('/api/staff-invitation/accept', { data: { token, name: 'Workflow Sales User', phone: `9${String(stamp).slice(-9)}`, password: 'Workflow!Pass2026' } }), 201)
  expect(accepted.data.email).toBe(email)
  const staff = await prisma.user.findUniqueOrThrow({ where: { email } })
  created.users.push(staff.id)
  expect(staff).toMatchObject({ role: 'SALES', status: 'ACTIVE' })
  expect((await page.request.post('/api/staff-invitation/accept', { data: { token, name: 'Replay User', phone: '9876501234', password: 'Workflow!Pass2026' } })).status()).toBe(410)

  await signIn(page, 'superadmin@deccanwheels.local')
  const superAdmin = await prisma.user.findUniqueOrThrow({ where: { email: 'superadmin@deccanwheels.local' } })
  const blocked = await page.request.patch(`/api/admin/users/${superAdmin.id}`, { data: { status: 'DISABLED' } })
  expect(blocked.status()).toBe(403)
  await expect(blocked.json()).resolves.toMatchObject({ error: { code: 'FORBIDDEN' } })
  await page.goto('/admin/audit-logs')
  await expect(page.getByText(/STAFF_INVITED|Staff invited/i).first()).toBeVisible()
})
