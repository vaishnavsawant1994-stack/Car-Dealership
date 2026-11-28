import 'dotenv/config'
import { assertAllowedDatabaseUrl, getCarDealershipEnvironment } from '../lib/config/isolation'
import { readCaptureKey } from '../lib/email/capture-crypto'

const env = getCarDealershipEnvironment()
const variables = {
  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_URL: process.env.DIRECT_URL,
  DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED,
}
for (const [name, value] of Object.entries(variables)) {
  if (value) assertAllowedDatabaseUrl(value, name)
}

if (env !== 'local' && env !== 'test') {
  if (!process.env.DATABASE_URL) throw new Error('A dedicated runtime DATABASE_URL is required.')
  if (process.env.EMAIL_DELIVERY_MODE !== 'capture') throw new Error('Outbound email delivery must remain disabled during Phase 0.')
  readCaptureKey(process.env.EMAIL_CAPTURE_KEY)
  if (!process.env.AUTH_SECRET || Buffer.byteLength(process.env.AUTH_SECRET) < 32) throw new Error('A unique strong auth secret must be supplied.')
  if (process.env.AUTH_GOOGLE_ID || process.env.AUTH_GOOGLE_SECRET) throw new Error('Hosted demo OAuth providers must remain disabled.')
  if (process.env.DEMO_BOOTSTRAP_APPROVED || process.env.DEMO_BOOTSTRAP_PASSWORD ||
      process.env.P006_STAGING_RESET_APPROVED || process.env.P006_STAGING_NEW_PASSWORD ||
      process.env.P006_STAGING_RESET_EMAIL) {
    throw new Error('One-time account provisioning/recovery credentials must never be present in the deployment runtime.')
  }
  if (!process.env.APP_PROJECT_ID || process.env.APP_PROJECT_ID !== 'car-dealership') throw new Error('Invalid Car-Dealership project marker.')

  const site = process.env.NEXT_PUBLIC_SITE_URL
  const auth = process.env.NEXTAUTH_URL
  if (!site || !auth) throw new Error('A separate Car-Dealership site and authentication origin are required.')
  const siteUrl = new URL(site)
  const authUrl = new URL(auth)
  if (siteUrl.protocol !== 'https:' || siteUrl.origin !== authUrl.origin ||
      /optimumautomobiles\.com|optimus-automobiles/i.test(siteUrl.hostname) ||
      siteUrl.hostname === 'localhost') {
    throw new Error('Car-Dealership requires a unique HTTPS site and matching authentication origin.')
  }
  if (process.env.IMAGE_STORAGE_DRIVER !== 's3' || process.env.PRIVATE_STORAGE_DRIVER !== 's3') {
    throw new Error('Independent public and private S3 storage is required for hosted environments.')
  }
  const bucket = process.env.S3_BUCKET || ''
  if (!bucket.startsWith(`car-dealership-`) || !bucket.includes(env)) {
    throw new Error('Hosted Car-Dealership storage bucket must be unique and environment-specific.')
  }
  const privateBucket = process.env.S3_PRIVATE_BUCKET || ''
  if (privateBucket !== `car-dealership-${env}-private` || privateBucket === bucket) {
    throw new Error('A separate private document bucket must be selected for this environment.')
  }
  if (bucket !== `car-dealership-${env}-public`) {
    throw new Error('The public media bucket must match the exact Car-Dealership environment.')
  }
  if (!process.env.EXPECTED_DATABASE_ID) throw new Error('Expected database instance fingerprint is required.')
  for (const name of ['S3_ENDPOINT', 'S3_REGION', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'S3_PUBLIC_BASE_URL']) {
    if (!process.env[name]) throw new Error(`Missing isolated storage configuration: ${name}`)
  }
}
console.info(`Car-Dealership isolation preflight passed for APP_ENV=${env}; no connection was attempted.`)
