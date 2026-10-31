import type { Metadata } from 'next'
import { ContactPage } from '@/components/interior/MarketingPages'
import { getPublishedContent } from '@/lib/content/public-content'

export const metadata: Metadata = {
  title: 'Contact Car Dealership Demo | Vehicle Demonstration',
  description: 'Contact Car Dealership Demo for premium pre-owned cars, vehicle sales, finance, insurance, RC transfer and after-sales support.',
}

export default async function Page() {
  return <ContactPage content={await getPublishedContent('contact')} />
}
