import type { Metadata } from 'next'
import { CompletePage } from '@/components/interior/CompletePage'
export const metadata: Metadata = { title: 'Extended Warranty | Car Dealership Demo', description: 'Understand optional extended-warranty eligibility, coverage and claims for selected cars.' }
export default function Page() { return <CompletePage pageKey="warranty" /> }
