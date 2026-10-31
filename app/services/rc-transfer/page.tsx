import type { Metadata } from 'next'
import { CompletePage } from '@/components/interior/CompletePage'
export const metadata: Metadata = { title: 'RC Ownership Transfer Assistance | Car Dealership Demo', description: 'Documented vehicle ownership-transfer coordination in Pune.' }
export default function Page() { return <CompletePage pageKey="transfer" /> }
