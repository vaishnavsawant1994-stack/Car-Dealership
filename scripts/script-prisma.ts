import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { assertAllowedDatabaseUrl } from '../lib/config/isolation'

export function createScriptPrismaClient() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL is not configured.')
  assertAllowedDatabaseUrl(connectionString, 'script runtime')
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
}

