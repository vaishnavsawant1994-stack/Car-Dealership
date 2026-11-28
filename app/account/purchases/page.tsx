import { redirect } from 'next/navigation'
import { CarFront } from 'lucide-react'
import Link from 'next/link'
import { AccountHeading, StatusBadge } from '@/components/account/AccountPrimitives'
import { requireAuthenticatedUser } from '@/lib/auth/session'
import { UserRole } from '@prisma/client'
import { listCustomerPurchases } from '@/lib/portal/customer-purchase-service'

const dealLabels: Record<string, string> = { OPEN: 'In progress', NEGOTIATION: 'In progress', WON: 'Purchase confirmed', LOST: 'Closed', CANCELLED: 'Closed' }
const deliveryLabels: Record<string, string> = { PREPARING: 'Preparing for handover', READY_FOR_HANDOVER: 'Ready for handover', HANDED_OVER: 'Delivered' }

export default async function PurchasesPage() {
  const user = await requireAuthenticatedUser('/account/purchases')
  if (user.role !== UserRole.CUSTOMER) redirect('/admin')
  const purchases = await listCustomerPurchases(user.id)
  return <>
    <AccountHeading eyebrow="My purchases" title="Purchase updates" text="See progress for deals linked to your signed-in account. Internal finance worksheets and staff notes are not shown here." action={{ label: 'Browse vehicles', href: '/inventory' }} />
    {purchases.length ? <div className="account-activity-list">{purchases.map((purchase) => <article className="account-section" key={purchase.id}>
      <header><span><strong>{purchase.vehicle.year} {purchase.vehicle.shortTitle}</strong><small><br />{purchase.referenceNumber} · {purchase.vehicle.stockNumber}{purchase.showroom ? ` · ${purchase.showroom.name}` : ''}</small></span><StatusBadge status={purchase.status === 'WON' ? 'completed' : purchase.status === 'LOST' || purchase.status === 'CANCELLED' ? 'cancelled' : 'pending'} /></header>
      <p>{dealLabels[purchase.status] ?? 'In progress'}</p>
      {purchase.deliveryCase ? <p><CarFront aria-hidden="true" /> Delivery {purchase.deliveryCase.referenceNumber}: {deliveryLabels[purchase.deliveryCase.status] ?? 'In progress'}</p> : null}
      {purchase.deliveryCase?.afterSalesTasks.length ? <p>After-sales care: {purchase.deliveryCase.afterSalesTasks.every((task) => task.status === 'COMPLETED') ? 'follow-up complete' : 'follow-up scheduled'}.</p> : null}
      <small>Last updated {purchase.updatedAt.toLocaleDateString('en-IN')}</small>
    </article>)}</div> : <section className="account-section"><p className="account-section__empty">No purchases are linked to this account yet. Your signed-in enquiries can be viewed in <Link href="/account/enquiries">Enquiries</Link>.</p></section>}
  </>
}
