import { AdminPageHeader } from '@/components/admin/AdminPrimitives'
import { WorkshopOrderWorkspace } from '@/components/admin/WorkshopOrderWorkspace'
import { hasPermission } from '@/lib/auth/admin-permissions'
import { requirePermission } from '@/lib/auth/require-permission'
import { listEligibleWorkshopVehicles, listWorkshopOrders } from '@/lib/workshop/workshop-service'
import { listParts } from '@/lib/parts/parts-service'

export default async function WorkshopPage() {
  const actor = await requirePermission('workshop.view')
  const [orders, eligibleVehicles, inventory] = await Promise.all([listWorkshopOrders(actor), listEligibleWorkshopVehicles(actor), listParts(actor)])
  return <>
    <AdminPageHeader title="Workshop" breadcrumb="Service / Job Cards"
      text="Manage internal service checklists and request parts for sold vehicles. Customer messages and billing are not handled here." />
    <WorkshopOrderWorkspace orders={orders} eligibleVehicles={eligibleVehicles} parts={inventory.parts} canUpdate={hasPermission(actor.role, 'workshop.update')} />
  </>
}
