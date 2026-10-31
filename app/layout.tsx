import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { SiteFrame } from '@/components/layout/SiteFrame'
import { AppProviders } from '@/components/providers/AppProviders'
import { businessIdentity } from '@/lib/constants/business'
import { prisma } from '@/lib/db/prisma'
import { unstable_cache } from 'next/cache'
import './globals.css'
import './customer.css'

const getSeoSettings = unstable_cache(async () => {
  try {
    return await Promise.race([
      prisma.siteSetting.findMany({ where: { key: { in: ['site_url', 'seo_default_title', 'seo_default_description', 'seo_og_image'] } } }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Metadata DB timeout')), 600)),
    ])
  } catch { return [] }
}, ['public-seo-settings'], { revalidate: 300 })

export async function generateMetadata(): Promise<Metadata> {
  const defaults = { title: 'Car Dealership Demo | Automotive Retail Platform', description: 'A demonstration dealership platform using synthetic information. Not an operating dealership.', image: '/images/hero/hero-audi-rs7-nardo-grey.webp' }
  let settings: Record<string, string> = {}
  const rows = process.env.APP_ENV === 'commercial' ? await getSeoSettings() : []
  settings = Object.fromEntries(rows.map((item) => [item.key, item.value]))
  const baseValue = process.env.NEXT_PUBLIC_SITE_URL || (process.env.APP_ENV === 'commercial' ? settings.site_url : '') || 'http://localhost:3001'
  const metadataBase = new URL(/^https?:\/\//.test(baseValue) ? baseValue : `https://${baseValue}`)
  const title = settings.seo_default_title || defaults.title
  const description = settings.seo_default_description || defaults.description
  const image = settings.seo_og_image || defaults.image
  return { metadataBase, title: { default: title, template: '%s' }, description, alternates: { canonical: '/' }, openGraph: { title, description, type: 'website', url: '/', siteName: businessIdentity.name, images: [{ url: image, alt: 'Car Dealership Demo vehicle showcase' }] }, twitter: { card: 'summary_large_image', title, description, images: [image] }, robots: { index: process.env.APP_ENV === 'commercial', follow: process.env.APP_ENV === 'commercial' } }
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'
  const organization = {
    '@context': 'https://schema.org',
    '@type': 'AutomotiveBusiness',
    name: businessIdentity.name,
    url: siteUrl,
    logo: `${siteUrl}${businessIdentity.logoUrl}`,
    telephone: businessIdentity.phoneNumber,
    email: businessIdentity.primaryEmail,
    contactPoint: [
      { '@type': 'ContactPoint', telephone: businessIdentity.phoneNumber, email: businessIdentity.primaryEmail, contactType: 'sales and customer service', areaServed: 'IN' },
      { '@type': 'ContactPoint', email: businessIdentity.secondaryEmail, contactType: 'alternate customer service', areaServed: 'IN' },
    ],
  }

  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        {process.env.APP_ENV === 'commercial' ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }} /> : null}
        <AppProviders>
          <SiteFrame header={<Header />} footer={<Footer />}>{children}</SiteFrame>
        </AppProviders>
      </body>
    </html>
  )
}
