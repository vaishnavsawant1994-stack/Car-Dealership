import 'dotenv/config'
import { defineConfig } from 'prisma/config'
import { assertAllowedDatabaseUrl } from './lib/config/isolation'

const datasourceUrl = [
  process.env.DIRECT_URL,
  process.env.DATABASE_URL_UNPOOLED,
  process.env.DATABASE_URL,
].find((value) => /^postgres(?:ql)?:\/\//.test(value ?? ''))

if (!datasourceUrl) {
  throw new Error('A valid PostgreSQL connection URL is required.')
}

// Guard every configured database URL, not only the selected migration target.
for (const candidate of [process.env.DIRECT_URL, process.env.DATABASE_URL_UNPOOLED, process.env.DATABASE_URL]) {
  if (candidate) assertAllowedDatabaseUrl(candidate, 'prisma config')
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: datasourceUrl,
  },
})
