import type { Metadata } from 'next'
import { CompletePage } from '@/components/interior/CompletePage'
export const metadata: Metadata = { title: 'Pre-Owned Car Guides | Car Dealership Demo', description: 'Practical guidance for buying and owning a premium pre-owned car.' }
export default function Page() { return <CompletePage pageKey="blog" /> }
