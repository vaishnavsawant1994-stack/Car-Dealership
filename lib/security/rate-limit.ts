import { createHash } from 'node:crypto'
import { prisma } from '@/lib/db/prisma'
import { logSafeError } from '@/lib/observability/safe-log'

type RateLimitResult = {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
  unavailable?: boolean
}

type RateLimitRow = { count: number; resetAt: Date }

export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const now = new Date()
  const resetAt = new Date(now.getTime() + windowMs)
  const bucketKey = createHash('sha256').update(key).digest('hex')

  try {
    const rows = await prisma.$queryRaw<RateLimitRow[]>`
      INSERT INTO "RateLimitBucket" ("key", "count", "resetAt", "updatedAt")
      VALUES (${bucketKey}, 1, ${resetAt}, ${now})
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE
          WHEN "RateLimitBucket"."resetAt" <= ${now} THEN 1
          ELSE "RateLimitBucket"."count" + 1
        END,
        "resetAt" = CASE
          WHEN "RateLimitBucket"."resetAt" <= ${now} THEN ${resetAt}
          ELSE "RateLimitBucket"."resetAt"
        END,
        "updatedAt" = ${now}
      RETURNING "count", "resetAt"
    `

    const bucket = rows[0]
    if (!bucket) throw new Error('Rate limit bucket was not returned')
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt.getTime() - now.getTime()) / 1000))
    return { allowed: bucket.count <= limit, remaining: Math.max(0, limit - bucket.count), retryAfterSeconds }
  } catch (error) {
    logSafeError('shared_rate_limiter_unavailable', error)
    return { allowed: false, remaining: 0, retryAfterSeconds: 60, unavailable: true }
  }
}

export function requestFingerprint(request: Request, scope: string) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const address = forwarded || request.headers.get('x-real-ip') || 'local'
  return `${scope}:${address}`
}
