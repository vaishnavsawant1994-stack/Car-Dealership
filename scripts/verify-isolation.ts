import 'dotenv/config'
import { assertAllowedDatabaseUrl, getCarDealershipEnvironment } from '../lib/config/isolation'

const env = getCarDealershipEnvironment()
for (const [name, value] of Object.entries({
  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_URL: process.env.DIRECT_URL,
  DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED,
})) {
  if (value) assertAllowedDatabaseUrl(value, name)
}

if (env !== 'local' && env !== 'test') {
  if (process.env.EMAIL_DELIVERY_MODE !== 'capture') throw new Error('Outbound email delivery is disabled for Phase 0.')
  if (!process.env.NEXT_PUBLIC_SITE_URL || /optimumautomobiles\.com/i.test(process.env.NEXT_PUBLIC_SITE_URL)) {
    throw new Error('A separate Car-Dealership site origin is required.')
  }
  if (!process.env.APP_PROJECT_ID) throw new Error('APP_PROJECT_ID is required.')
}
console.info(`Car-Dealership isolation preflight passed for APP_ENV=${env}; no connection was attempted.`)
