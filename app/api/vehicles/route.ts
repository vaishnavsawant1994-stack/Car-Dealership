import { NextRequest, NextResponse } from 'next/server'
import { getInventory } from '@/lib/services/inventory-service'
import { parseInventoryFilters } from '@/lib/validation/inventory'
import { logSafeError } from '@/lib/observability/safe-log'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const filters = parseInventoryFilters(Object.fromEntries(request.nextUrl.searchParams))
    return NextResponse.json(await getInventory(filters))
  } catch (error) {
    logSafeError('inventory_api_failed', error)
    return NextResponse.json({ error: { code: 'INVENTORY_UNAVAILABLE', message: 'Inventory is temporarily unavailable.' } }, { status: 503 })
  }
}
