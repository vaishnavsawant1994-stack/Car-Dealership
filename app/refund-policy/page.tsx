import type { Metadata } from 'next'
import { LegalPage } from '@/components/interior/CompletePage'

export const metadata: Metadata = { title: 'Demo Payments Notice | Car Dealership Demo', robots: { index: false, follow: false } }
export default function Page() {
  return <LegalPage title="Demo Payments & Refunds" updated="31 October 2026">
    <h2>No real transactions</h2>
    <p>This is a software demonstration. Payments, reservations, invoices and refund examples are illustrative and must not be used for actual purchases.</p>
    <h2>Future production terms</h2>
    <p>Any commercial installation will require dealership-approved booking, cancellation, refund, tax and consumer-protection terms before real financial transactions are enabled.</p>
  </LegalPage>
}
