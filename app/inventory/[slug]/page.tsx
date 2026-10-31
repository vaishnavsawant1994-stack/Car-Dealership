import type { Metadata } from 'next'
import { BadgeCheck, Banknote, Check, MapPin, MessageCircle, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'
import { RelatedVehicles } from '@/components/inventory/RelatedVehicles'
import { VehicleActions } from '@/components/inventory/VehicleActions'
import { VehicleGallery } from '@/components/inventory/VehicleGallery'
import { buildVehicleWhatsAppUrl } from '@/lib/constants/business'
import { getVehicleDetail } from '@/lib/services/vehicle-detail-service'

export const dynamic = 'force-dynamic'

type PageProps = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const result = await getVehicleDetail(slug)
  if (!result) return { title: 'Vehicle Not Found | Car Dealership Demo', robots: { index: false, follow: false } }
  const { vehicle } = result
  const title = `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.variant} | Car Dealership Demo`
  const description = `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.variant}, ${vehicle.mileage}, ${vehicle.fuel}, available in Pune for ${vehicle.price}.`
  return { title, description, alternates: { canonical: `/inventory/${vehicle.slug}` }, openGraph: { title, description, images: [vehicle.image], type: 'website' }, robots: vehicle.status === 'SOLD' ? { index: false, follow: true } : undefined }
}

export default async function VehiclePage({ params }: PageProps) {
  const { slug } = await params
  const result = await getVehicleDetail(slug, { incrementView: true })
  if (!result) notFound()
  if (result.redirectedFrom) permanentRedirect(`/inventory/${result.vehicle.slug}`)
  const { vehicle, related } = result
  const fullTitle = `${vehicle.make} ${vehicle.model}`
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001'
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${vehicle.year} ${fullTitle} ${vehicle.variant}`,
    image: vehicle.images.map((image) => image.url),
    description: vehicle.shortDescription,
    sku: vehicle.stockNumber,
    brand: { '@type': 'Brand', name: vehicle.make },
    offers: { '@type': 'Offer', priceCurrency: 'INR', price: vehicle.priceValue, availability: vehicle.status === 'SOLD' ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock', url: `${siteUrl}/inventory/${vehicle.slug}` },
  }
  const breadcrumbs = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl }, { '@type': 'ListItem', position: 2, name: 'Inventory', item: `${siteUrl}/inventory` }, { '@type': 'ListItem', position: 3, name: fullTitle, item: `${siteUrl}/inventory/${vehicle.slug}` }] }

  return (
    <main className="vehicle-detail-page" id="main-content">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <div className="vehicle-detail-breadcrumb container-wide"><Link href="/">Home</Link><span>/</span><Link href="/inventory">Inventory</Link><span>/</span><strong>{fullTitle}</strong></div>
      <section className="vehicle-detail-hero container-wide">
        <VehicleGallery images={vehicle.images} title={fullTitle} />
        <aside className="vehicle-detail-summary">
          <div className="vehicle-detail-summary__status"><span className={`vehicle-status vehicle-status--${vehicle.status.toLowerCase()}`}>{vehicle.badge}</span>{vehicle.certified ? <span><BadgeCheck />Certified</span> : null}</div>
          <p>{vehicle.year} luxury pre-owned vehicle</p><h1>{fullTitle}</h1><h2>{vehicle.variant}</h2><strong className="vehicle-detail-price">{vehicle.price}</strong>{vehicle.originalPrice ? <del>{vehicle.originalPrice}</del> : null}
          <dl><div><dt>Stock</dt><dd>{vehicle.stockNumber}</dd></div><div><dt>Location</dt><dd><MapPin />{vehicle.location}</dd></div></dl>
          {vehicle.status === 'SOLD' ? <div className="vehicle-unavailable-note">This vehicle has been sold. Explore similar available cars below.</div> : <VehicleActions vehicleId={vehicle.id} slug={vehicle.slug} title={`${vehicle.year} ${fullTitle}`} />}
          <a className="vehicle-whatsapp" href={buildVehicleWhatsAppUrl({ year: vehicle.year, make: vehicle.make, model: vehicle.model, variant: vehicle.variant, stockNumber: vehicle.stockNumber })} target="_blank" rel="noreferrer"><MessageCircle />Enquire about this car on WhatsApp</a>
        </aside>
      </section>
      <section className="vehicle-detail-content container-wide">
        <div className="vehicle-detail-main">
          <section className="vehicle-detail-section"><header><small>At a glance</small><h2>Core Specifications</h2></header><dl className="vehicle-spec-grid">{vehicle.specifications.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl></section>
          <section className="vehicle-detail-section"><header><small>The complete picture</small><h2>Vehicle Overview</h2></header><p className="vehicle-overview-lead">{vehicle.shortDescription}</p><p>{vehicle.description}</p></section>
          <section className="vehicle-detail-section"><header><small>Equipment</small><h2>Features</h2></header><div className="vehicle-feature-groups">{vehicle.featureGroups.map((group) => <article key={group.category}><h3>{group.category}</h3><ul>{group.items.map((feature) => <li key={feature.name}><Check />{feature.name}{feature.value ? <small>{feature.value}</small> : null}</li>)}</ul></article>)}</div></section>
        </div>
        <aside className="vehicle-detail-aside"><section><ShieldCheck /><h2>Optimum Certified</h2><p>Multi-point inspection, verified documents and transparent condition reporting.</p><ul><li><Check />Ownership records checked</li><li><Check />Road-tested by specialists</li><li><Check />Service history reviewed</li></ul></section><section><Banknote /><h2>Flexible Finance</h2><p>Explore tailored loan options from leading banking partners.</p><Link className="gold-button" href="/services/finance">Explore Finance</Link></section></aside>
      </section>
      {related.length ? <section className="vehicle-related container-wide"><header><small>More to explore</small><h2>Related Vehicles</h2></header><RelatedVehicles vehicles={related} /></section> : null}
    </main>
  )
}
