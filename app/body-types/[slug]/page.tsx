import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { InventoryPage } from '@/components/inventory/InventoryPage'
import { getBodyTypeBySlug } from '@/lib/repositories/body-type-repository'
import { getInventory } from '@/lib/services/inventory-service'
import { parseInventoryFilters } from '@/lib/validation/inventory'

export const dynamic = 'force-dynamic'
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  const { slug } = await params
  const bodyType = await getBodyTypeBySlug(slug)
  if (!bodyType) return { title: 'Body Type Not Found | Car Dealership Demo', robots: { index: false } }
  return { title: `Pre-Owned Luxury ${bodyType.name} Cars | Car Dealership Demo`, description: `${bodyType.description} Browse ${bodyType._count.vehicles} available cars in Pune.`, alternates: { canonical: `/body-types/${bodyType.slug}` } }
}

export default async function BodyTypePage({ params, searchParams }: Props) {
  const { slug } = await params
  const bodyType = await getBodyTypeBySlug(slug)
  if (!bodyType) notFound()
  const filters = parseInventoryFilters({ ...(await searchParams), bodyType: slug })
  const result = await getInventory(filters)
  return <Suspense fallback={<main className="interior-loading" id="main-content">Loading {bodyType.name} inventory...</main>}><InventoryPage result={result} basePath={`/body-types/${slug}`} lockedFilter="bodyType" eyebrow={`Home / Body Types / ${bodyType.name}`} title={bodyType.name} accent="Collection" description={`${bodyType._count.vehicles} available vehicles. ${bodyType.description}`} /></Suspense>
}
