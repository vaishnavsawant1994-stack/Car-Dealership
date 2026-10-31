import type { Metadata } from 'next'
import { CompletePage } from '@/components/interior/CompletePage'
export const metadata: Metadata = { title: 'Our Buying Process | Car Dealership Demo', description: 'How viewing, inspection, agreement, paperwork and delivery work.' }
export default function Page() { return <CompletePage pageKey="process" /> }
