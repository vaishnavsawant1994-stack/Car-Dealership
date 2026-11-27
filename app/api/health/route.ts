import { NextResponse } from 'next/server'
import { checkDatabaseHealth } from '@/lib/db/health'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const database = await checkDatabaseHealth()
  const healthy = database.healthy

  return NextResponse.json(
    {
      status: healthy ? 'ok' : 'unavailable',
      checks: { database: healthy ? 'ok' : 'failed' },
      checkedAt: database.checkedAt,
      latencyMs: database.latencyMs,
    },
    {
      status: healthy ? 200 : 503,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    },
  )
}
