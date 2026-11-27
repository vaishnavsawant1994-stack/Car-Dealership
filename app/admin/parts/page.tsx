import { AdminPageHeader } from '@/components/admin/AdminPrimitives'
import { PartsInventoryWorkspace } from '@/components/admin/PartsInventoryWorkspace'
import { hasPermission } from '@/lib/auth/admin-permissions'
import { requirePermission } from '@/lib/auth/require-permission'
import { listParts, listWorkshopPartRequests } from '@/lib/parts/parts-service'

export default async function PartsPage() {
  const actor = await requirePermission('parts.view')
  const [inventory, requests] = await Promise.all([listParts(actor), listWorkshopPartRequests(actor)])
  return <>
    <AdminPageHeader title="Parts Inventory" breadcrumb="Workshop / Inventory"
      text="Track branch stock as an auditable ledger. Workshop requests remain open until a parts manager issues stock." />
    <PartsInventoryWorkspace {...inventory} requests={requests} canUpdate={hasPermission(actor.role, 'parts.update')} />
  </>
}
