import { expect, test } from '@playwright/test'

const password = process.env.SEED_ADMIN_PASSWORD as string | undefined
if (!password) throw new Error('Set SEED_ADMIN_PASSWORD in the ignored local .env file before running E2E tests.')
const seedPassword = password as string

async function signIn(page: import('@playwright/test').Page, callbackUrl = '/account') {
  await page.goto(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`)
  const form = page.locator('.auth-form').first()
  await form.getByLabel('Email address').fill('customer@deccanwheels.local')
  await form.getByLabel('Password', { exact: true }).fill(seedPassword)
  await form.getByRole('button', { name: /^sign in/i }).click()
  await expect(page).toHaveURL(new RegExp(`${callbackUrl.replace('/', '\\/')}$`), { timeout: 15_000 })
}

test('verified customer signs in and sees database-backed account data', async ({ page }) => {
  await signIn(page)
  await expect(page.getByRole('heading', { name: /welcome, aarav/i })).toBeVisible()
  await expect(page.getByText('OA-ENQ-DEMO-000001').filter({ visible: true })).toBeVisible()
  await page.goto('/account/favourites', { waitUntil: 'domcontentloaded' })
  await expect(page).toHaveURL(/\/account\/favourites$/, { timeout: 15_000 })
  await expect(page.locator('.inventory-card').first()).toBeVisible({ timeout: 15_000 })
  expect(await page.locator('.inventory-card').count()).toBeGreaterThanOrEqual(3)
})

test('account record ownership is enforced', async ({ page }) => {
  await signIn(page, '/account/enquiries')
  await page.goto('/account/enquiries/OA-ENQ-LEGACY-000001')
  await expect(page.getByRole('heading', { name: 'Record not found' })).toBeVisible()
  await page.goto('/account/enquiries/OA-ENQ-DEMO-000001')
  await expect(page.getByText('OA-ENQ-DEMO-000001').filter({ visible: true })).toBeVisible()
  await expect(page.getByText('Original message').filter({ visible: true })).toBeVisible()
})

test('guest favourites migrate into the verified customer account', async ({ page }) => {
  const vehicles = await page.request.get('/api/vehicles?pageSize=12')
  const payload = await vehicles.json() as { items: Array<{ id: string }> }
  const guestVehicleId = payload.items[5]!.id
  await page.addInitScript(({ vehicleId }) => {
    localStorage.setItem('inventory-favorites', JSON.stringify([vehicleId]))
  }, { vehicleId: guestVehicleId })
  await signIn(page, '/favorites')
  await expect.poll(async () => page.evaluate(() => localStorage.getItem('inventory-favorites'))).toBeNull()
  await expect(page.locator('.inventory-card')).toHaveCount(4)
})

test('pending customer cannot sign in before email verification', async ({ page }) => {
  await page.goto('/login')
  const form = page.locator('.auth-form').first()
  await form.getByLabel('Email address').fill('pending@deccanwheels.local')
  await form.getByLabel('Password', { exact: true }).fill(seedPassword)
  await form.getByRole('button', { name: /^sign in/i }).click()
  await expect(form.getByRole('alert')).toContainText('Verify your email')
})
