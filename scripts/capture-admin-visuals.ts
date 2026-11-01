import 'dotenv/config'

import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium, type Page } from '@playwright/test'

const baseURL = process.env.ADMIN_VISUAL_BASE_URL ?? 'http://localhost:3001'
const outputDir = resolve(process.cwd(), 'docs', 'screenshots', 'admin')
const password = process.env.SEED_ADMIN_PASSWORD as string | undefined
if (!password) throw new Error('Set SEED_ADMIN_PASSWORD in the ignored local .env file before capturing admin visuals.')
const seedPassword = password as string

async function signIn(page: Page) {
  await page.goto(`${baseURL}/login?callbackUrl=%2Fadmin`)
  const form = page.locator('.auth-form').first()
  await form.getByLabel('Email address').fill('admin@deccanwheels.local')
  await form.getByLabel('Password', { exact: true }).fill(seedPassword)
  await form.getByRole('button', { name: /^sign in/i }).click()
  await page.waitForURL(/\/admin(?:\?.*)?$/, { timeout: 20_000 })
}

async function capture(page: Page, route: string, width: number, height: number, filename: string) {
  await page.setViewportSize({ width, height })
  await page.goto(`${baseURL}${route}`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await page.locator('#admin-main').waitFor({ state: 'visible', timeout: 20_000 })
  await page.waitForTimeout(500)
  await page.screenshot({ path: resolve(outputDir, filename), animations: 'disabled', caret: 'initial' })
  await page.waitForTimeout(250)
}

async function main() {
  await mkdir(outputDir, { recursive: true })
  const browser = await chromium.launch({ channel: process.platform === 'win32' ? 'msedge' : undefined })
  const context = await browser.newContext({ colorScheme: 'dark' })
  const page = await context.newPage()
  await signIn(page)

  await capture(page, '/admin', 1440, 1000, 'dashboard-1440x1000.png')
  await capture(page, '/admin', 1024, 1200, 'dashboard-1024x1200.png')
  await capture(page, '/admin', 390, 844, 'dashboard-390x844.png')
  await page.getByRole('button', { name: 'Open admin menu' }).click()
  await page.screenshot({ path: resolve(outputDir, 'dashboard-mobile-drawer-390x844.png'), animations: 'disabled', caret: 'initial' })

  await capture(page, '/admin/vehicles', 1440, 1000, 'vehicle-list-1440x1000.png')
  await capture(page, '/admin/vehicles', 390, 844, 'vehicle-list-390x844.png')
  await capture(page, '/admin/vehicles/new', 1440, 1200, 'vehicle-editor-1440x1200.png')
  await capture(page, '/admin/vehicles/new', 390, 844, 'vehicle-editor-390x844.png')

  await page.setViewportSize({ width: 1440, height: 1200 })
  await page.goto(`${baseURL}/admin/enquiries`, { waitUntil: 'domcontentloaded' })
  const enquiryRoute = await page.getByRole('link', { name: 'DW-ENQ-DEMO-000001' }).first().getAttribute('href')
  if (!enquiryRoute) throw new Error('Seeded enquiry route was not found.')
  await capture(page, enquiryRoute, 1440, 1200, 'enquiry-detail-1440x1200.png')
  await capture(page, enquiryRoute, 390, 844, 'enquiry-detail-390x844.png')

  await page.setViewportSize({ width: 1440, height: 1200 })
  await page.goto(`${baseURL}/admin/sell-requests`, { waitUntil: 'domcontentloaded' })
  const sellRoute = await page.getByRole('link', { name: 'DW-SELL-DEMO-000001' }).first().getAttribute('href')
  if (!sellRoute) throw new Error('Seeded sell-request route was not found.')
  await capture(page, sellRoute, 1440, 1200, 'sell-request-detail-1440x1200.png')
  await capture(page, sellRoute, 390, 844, 'sell-request-detail-390x844.png')

  await capture(page, '/admin/users', 1440, 1000, 'user-management-1440x1000.png')
  await capture(page, '/admin/users', 390, 844, 'user-management-390x844.png')

  const timeout = () => new Promise<void>((done) => setTimeout(done, 3_000))
  await Promise.race([context.close(), timeout()])
  await Promise.race([browser.close(), timeout()])
  console.log(`Captured admin visual verification at ${outputDir}`)
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
