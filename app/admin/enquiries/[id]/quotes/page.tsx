import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AdminPageHeader, AdminStatus } from '@/components/admin/AdminPrimitives'
import { SalesQuoteDraftManager } from '@/components/admin/SalesQuoteDraftManager'
import { hasPermission } from '@/lib/auth/admin-permissions'
import { requirePermission } from '@/lib/auth/require-permission'
import { getSalesQuoteDrafts } from '@/lib/sales/quote-service'
import { getActiveSalesDealForInquiry } from '@/lib/sales/deal-service'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePermission('enquiry.view')
  const { id } = await params
  const [data, activeDeal] = await Promise.all([
    getSalesQuoteDrafts(id, actor), getActiveSalesDealForInquiry(id, actor),
  ])
  if (!data) notFound()
  return <>
    <AdminPageHeader title="Internal Sales Quote Drafts"
      text={`Enquiry ${data.inquiry.referenceNumber}. Pricing estimates only; not a buyer invoice or contract.`}
      breadcrumb="Enquiries / Quote Drafts"
      actions={<>
        <AdminStatus value={data.inquiry.status} />
        <Link className="admin-button admin-button--secondary" href={`/admin/enquiries/${id}`}>Back to enquiry</Link>
      </>}
    />
    <SalesQuoteDraftManager inquiryId={id} currentPrice={data.inquiry.vehicle?.price ?? 0}
      canCreate={data.canCreate && hasPermission(actor.role, 'enquiry.update')}
      canCreateDeal={data.canCreate && !!data.drafts.length && hasPermission(actor.role, 'enquiry.update') && !activeDeal}
      existingDeal={activeDeal}
      drafts={data.drafts.map((draft) => ({ ...draft, createdAt: draft.createdAt.toISOString() }))} />
  </>
}
