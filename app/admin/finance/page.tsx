import { AdminPageHeader } from '@/components/admin/AdminPrimitives'
import { FinanceInvoiceDraftWorkspace } from '@/components/admin/FinanceInvoiceDraftWorkspace'
import { requirePermission } from '@/lib/auth/require-permission'
import { listSalesInvoiceDrafts, listWonSalesDealsForFinance } from '@/lib/finance/invoice-draft-service'
import { paymentMode } from '@/lib/payments/sandbox'

export default async function FinancePage() {
  const actor = await requirePermission('finance.view')
  const [drafts, eligibleDeals] = await Promise.all([
    listSalesInvoiceDrafts(actor), listWonSalesDealsForFinance(actor),
  ])
  return <>
    <AdminPageHeader title="Finance Review"
      text="Prepare internal finance worksheets from accepted sales deals. These records are not legal or tax invoices and cannot collect or record payments."
      breadcrumb="Finance" />
    <FinanceInvoiceDraftWorkspace eligibleDeals={eligibleDeals} drafts={drafts} sandboxEnabled={paymentMode() === 'sandbox'} />
  </>
}
