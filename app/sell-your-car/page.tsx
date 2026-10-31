import type { Metadata } from 'next'
import { SellYourCarPage } from '@/components/interior/MarketingPages'

export const metadata: Metadata = {
  title: 'Sell Your Luxury Car in Pune | Car Dealership Demo',
  description: 'Get a transparent illustrative vehicle valuation workflows for demo purposes.',
}

export default function Page() {
  return <SellYourCarPage />
}
