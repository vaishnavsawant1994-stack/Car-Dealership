import { AdminPageHeader } from '@/components/admin/AdminPrimitives'
import { DeliveryCaseWorkspace } from '@/components/admin/DeliveryCaseWorkspace'
import { hasPermission } from '@/lib/auth/admin-permissions'
import { requirePermission } from '@/lib/auth/require-permission'
import { listDeliveryCases, listEligibleDealsForDelivery } from '@/lib/delivery/delivery-service'

export default async function DeliveryPage() {
  const actor = await requirePermission('delivery.view')
  const [cases, eligibleDeals] = await Promise.all([listDeliveryCases(actor), listEligibleDealsForDelivery(actor)])
  return <>
    <AdminPageHeader title="Delivery & RC Transfer" breadcrumb="Operations / Delivery"
      text="Prepare vehicle handover through a verified checklist. The application does not submit RC transfers or send customer communications." />
    <DeliveryCaseWorkspace cases={cases} eligibleDeals={eligibleDeals}
      canUpdate={hasPermission(actor.role, 'delivery.update')}
      canVerifySettlement={hasPermission(actor.role, 'delivery.settlementVerify')} />
  </>
}
