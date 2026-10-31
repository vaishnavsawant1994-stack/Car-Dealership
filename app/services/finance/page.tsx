import type { Metadata } from 'next'
import { CompletePage } from '@/components/interior/CompletePage'
export const metadata: Metadata = { title: 'Car Finance Assistance | Car Dealership Demo', description: 'Clear car finance application and lender coordination support in Pune.' }
export default function Page() { return <CompletePage pageKey="finance" /> }
