import { AdminPageHeader } from '@/components/admin/AdminPrimitives'
import { AfterSalesWorkspace } from '@/components/admin/AfterSalesWorkspace'
import { hasPermission } from '@/lib/auth/admin-permissions'
import { requirePermission } from '@/lib/auth/require-permission'
import { listAfterSalesTasks, listEligibleDeliveredCases } from '@/lib/after-sales/after-sales-service'

export default async function AfterSalesPage() {
  const actor = await requirePermission('afterSales.view')
  const [tasks, eligibleDeliveries] = await Promise.all([listAfterSalesTasks(actor), listEligibleDeliveredCases(actor)])
  return <>
    <AdminPageHeader title="After-sales Care" breadcrumb="Customer Operations / After-sales"
      text="Schedule internal service, warranty, document and feedback follow-ups after handover. This workspace does not contact customers or show customer contact details." />
    <AfterSalesWorkspace tasks={tasks} eligibleDeliveries={eligibleDeliveries} canUpdate={hasPermission(actor.role, 'afterSales.update')} />
  </>
}
