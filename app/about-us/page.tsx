import type { Metadata } from 'next'
import { AboutPage } from '@/components/interior/MarketingPages'
import { getPublishedContent } from '@/lib/content/public-content'

export const metadata: Metadata = {
  title: 'About Car Dealership Demo | Premium Pre-Owned Luxury Cars',
  description: 'Discover the story, standards and people behind the demonstration premium pre-owned luxury car destination.',
}

export default async function Page() {
  return <AboutPage content={await getPublishedContent('about')} />
}
