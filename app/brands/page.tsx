import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { PageHero } from '@/components/interior/PagePrimitives'
import { interiorImages } from '@/lib/constants/interior'
import { getActiveBrands } from '@/lib/repositories/brand-repository'
import { mapBrandSummary } from '@/lib/services/inventory-service'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Luxury Car Brands | Car Dealership Demo', description: 'Explore premium pre-owned luxury cars by brand in Pune.', alternates: { canonical: '/brands' } }

export default async function BrandsPage() {
  const brands = (await getActiveBrands()).map(mapBrandSummary)
  return <main className="interior-page directory-page" id="main-content"><PageHero compact eyebrow="Home / Brands" title="Browse By" accent="Brand" text="Discover verified premium cars from the world's most respected marques." image={interiorImages.hero} /><section className="directory-grid container-wide">{brands.map((brand) => <article key={brand.id}><div className="directory-logo"><Image src={brand.logoUrl} alt={brand.logoAlt} width={120} height={72} /></div><div><small>{brand.country}</small><h2>{brand.name}</h2><p>{brand.description}</p></div><footer><span>{brand.vehicleCount} cars available</span><Link href={`/brands/${brand.slug}`}>View Cars <ArrowRight /></Link></footer></article>)}</section></main>
}
