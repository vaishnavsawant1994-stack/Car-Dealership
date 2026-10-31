import type { Metadata } from 'next'
import { LegalPage } from '@/components/interior/CompletePage'

export const metadata: Metadata = { title: 'Demonstration Terms | Car Dealership Demo', robots: { index: false, follow: false } }
export default function Page() {
  return <LegalPage title="Demonstration Terms" updated="31 October 2026">
    <h2>Not a real dealership offer</h2>
    <p>Car Dealership Demo is a software demonstration. Vehicle listings, showroom details, prices and customer stories are illustrative, not actual commercial offers.</p>
    <h2>No purchases or payments</h2>
    <p>Do not send deposits, payments, legal documents or sensitive personal information through this demonstration. No real vehicle reservation, financing, insurance or delivery is provided.</p>
    <h2>Demonstration access</h2>
    <p>Use access only as authorised for software evaluation. A separate commercial agreement and jurisdiction-specific terms will be required for a production dealership.</p>
  </LegalPage>
}
