import type { Metadata } from 'next'
import { ArrowRight, CarFront } from 'lucide-react'
import Link from 'next/link'
import { PageHero } from '@/components/interior/PagePrimitives'
import { interiorImages } from '@/lib/constants/interior'
import { getActiveBodyTypes } from '@/lib/repositories/body-type-repository'
import { mapBodyTypeSummary } from '@/lib/services/inventory-service'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Luxury Cars by Body Type | Car Dealership Demo', description: 'Browse premium pre-owned sedans, SUVs, coupes, sports cars and more.', alternates: { canonical: '/body-types' } }

export default async function BodyTypesPage() {
  const bodyTypes = (await getActiveBodyTypes()).map(mapBodyTypeSummary)
  return <main className="interior-page directory-page" id="main-content"><PageHero compact eyebrow="Home / Body Types" title="Choose Your" accent="Style" text="Explore premium pre-owned vehicles shaped around the way you drive." image={interiorImages.hero} /><section className="directory-grid directory-grid--body container-wide">{bodyTypes.map((bodyType) => <article key={bodyType.id}><div className="directory-icon"><CarFront /></div><div><small>Vehicle category</small><h2>{bodyType.name}</h2><p>{bodyType.description}</p></div><footer><span>{bodyType.vehicleCount} cars available</span><Link href={`/body-types/${bodyType.slug}`}>Explore <ArrowRight /></Link></footer></article>)}</section></main>
}
