import type { Metadata } from 'next'
import { Suspense } from 'react'
import { InventoryPage } from '@/components/inventory/InventoryPage'
import { getInventory } from '@/lib/services/inventory-service'
import { parseInventoryFilters } from '@/lib/validation/inventory'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Luxury Pre-Owned Car Inventory | Car Dealership Demo',
  description: 'Browse verified premium pre-owned Mercedes-Benz, BMW, Audi, Porsche, Land Rover and other luxury cars in Pune.',
  alternates: { canonical: '/inventory' },
}

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = parseInventoryFilters(await searchParams)
  const result = await getInventory(filters)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001'
  const itemList = { '@context': 'https://schema.org', '@type': 'ItemList', numberOfItems: result.pagination.totalItems, itemListElement: result.items.map((vehicle, index) => ({ '@type': 'ListItem', position: (result.pagination.page - 1) * result.pagination.pageSize + index + 1, name: `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.variant}`, url: `${siteUrl}/inventory/${vehicle.slug}` })) }
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} /><Suspense fallback={<main className="interior-loading" id="main-content">Loading inventory...</main>}><InventoryPage result={result} /></Suspense></>
}
