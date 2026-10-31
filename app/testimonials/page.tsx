import type { Metadata } from 'next'
import { CompletePage } from '@/components/interior/CompletePage'
import { CustomerReviews } from '@/components/shared/CustomerReviews'
export const metadata: Metadata = { title: 'Customer Testimonials | Car Dealership Demo', description: 'Published and responsibly labelled customer feedback.' }
export default function Page() { return <><CompletePage pageKey="reviews" /><CustomerReviews title="Published Customer Reviews" /></> }
