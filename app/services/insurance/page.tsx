import type { Metadata } from 'next'
import { CompletePage } from '@/components/interior/CompletePage'
export const metadata: Metadata = { title: 'Car Insurance Assistance | Car Dealership Demo', description: 'Insurance quotation, policy and transfer coordination for pre-owned cars.' }
export default function Page() { return <CompletePage pageKey="insurance" /> }
