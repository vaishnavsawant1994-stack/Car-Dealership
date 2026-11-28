import { AdminPageHeader } from '@/components/admin/AdminPrimitives'
import { WorkshopOrderWorkspace } from '@/components/admin/WorkshopOrderWorkspace'
import { hasPermission } from '@/lib/auth/admin-permissions'
import { requirePermission } from '@/lib/auth/require-permission'
import { listEligibleWorkshopVehicles, listWorkshopOrders } from '@/lib/workshop/workshop-service'

export default async function WorkshopPage() {
  const actor = await requirePermission('workshop.view')
  const [orders, eligibleVehicles] = await Promise.all([listWorkshopOrders(actor), listEligibleWorkshopVehicles(actor)])
  return <>
    <AdminPageHeader title="Workshop" breadcrumb="Service / Job Cards"
      text="Manage internal service and repair checklists for sold vehicles. Parts, customer messages and billing are not handled here." />
    <WorkshopOrderWorkspace orders={orders} eligibleVehicles={eligibleVehicles} canUpdate={hasPermission(actor.role, 'workshop.update')} />
  </>
}
