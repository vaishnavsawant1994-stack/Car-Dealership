import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { InventoryPage } from '@/components/inventory/InventoryPage'
import { getBrandBySlug } from '@/lib/repositories/brand-repository'
import { getInventory } from '@/lib/services/inventory-service'
import { parseInventoryFilters } from '@/lib/validation/inventory'

export const dynamic = 'force-dynamic'
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  const { slug } = await params
  const brand = await getBrandBySlug(slug)
  if (!brand) return { title: 'Brand Not Found | Car Dealership Demo', robots: { index: false } }
  return { title: `Pre-Owned ${brand.name} Cars | Car Dealership Demo`, description: `${brand.description} Browse ${brand._count.vehicles} available vehicles in Pune.`, alternates: { canonical: `/brands/${brand.slug}` } }
}

export default async function BrandPage({ params, searchParams }: Props) {
  const { slug } = await params
  const brand = await getBrandBySlug(slug)
  if (!brand) notFound()
  const filters = parseInventoryFilters({ ...(await searchParams), brand: slug })
  const result = await getInventory(filters)
  return <Suspense fallback={<main className="interior-loading" id="main-content">Loading {brand.name} inventory...</main>}><InventoryPage result={result} basePath={`/brands/${slug}`} lockedFilter="brand" eyebrow={`Home / Brands / ${brand.name}`} title={brand.name} accent="Inventory" description={`${brand._count.vehicles} available ${brand.name} vehicles. ${brand.description}`} /></Suspense>
}
