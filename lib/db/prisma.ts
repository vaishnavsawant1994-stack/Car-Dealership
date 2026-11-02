import 'server-only'

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { assertAllowedDatabaseUrl } from '@/lib/config/isolation'
import { withVerifyFullSslMode } from '@/lib/config/postgres-connection'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL is required to create the Prisma client.')
  assertAllowedDatabaseUrl(connectionString, 'application runtime')

  const adapter = new PrismaPg({ connectionString: withVerifyFullSslMode(connectionString) })
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

