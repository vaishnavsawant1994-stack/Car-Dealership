import type { Metadata } from 'next'
import { LegalPage } from '@/components/interior/CompletePage'

export const metadata: Metadata = { title: 'Demonstration Privacy Notice | Car Dealership Demo', robots: { index: false, follow: false } }
export default function Page() {
  return <LegalPage title="Demonstration Privacy Notice" updated="31 October 2026">
    <h2>Use fictional information</h2>
    <p>This application is a product demonstration. Do not enter real identity documents, banking details, customer records or sensitive personal data.</p>
    <h2>What the demo records</h2>
    <p>When test features are enabled, entered demonstration information may be saved to an isolated demo database to illustrate accounts, enquiries and operational workflows.</p>
    <h2>Separate production policy required</h2>
    <p>Before any dealership handles real customers, it must adopt an approved privacy notice, data retention policy, security review and consent procedures appropriate to its location.</p>
  </LegalPage>
}
