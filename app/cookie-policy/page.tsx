import type { Metadata } from 'next'
import { LegalPage } from '@/components/interior/CompletePage'

export const metadata: Metadata = { title: 'Demo Cookie Notice | Car Dealership Demo', robots: { index: false, follow: false } }
export default function Page() {
  return <LegalPage title="Demo Cookies & Local Storage" updated="31 October 2026">
    <h2>Essential browser storage</h2>
    <p>The demonstration may use cookies and local storage for login, session integrity, saved vehicles and display preferences.</p>
    <h2>External analytics</h2>
    <p>Client-demo analytics and advertising integrations are not authorised until they have been separately configured and reviewed. Use fictional data when exploring the site.</p>
  </LegalPage>
}
