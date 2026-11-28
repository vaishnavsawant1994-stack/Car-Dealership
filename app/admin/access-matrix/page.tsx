import Link from 'next/link'
import { AdminPageHeader } from '@/components/admin/AdminPrimitives'
import { adminPermissions, hasPermission } from '@/lib/auth/admin-permissions'
import { requirePermission } from '@/lib/auth/require-permission'
import { UserRole } from '@prisma/client'

const roles = Object.values(UserRole)
const roleDescriptions: Record<UserRole, string> = {
  CUSTOMER: 'Customer account; no staff application access.',
  SALES: 'Customer enquiries, test drives, and assigned sales follow-up, including delivery visibility.',
  FINANCE: 'Finance review and internal worksheets, plus cleared funds verification for delivery.',
  WORKSHOP: 'Workshop job cards and service checklist work within assigned branches.',
  PARTS_MANAGER: 'Branch parts stock movements and workshop issue requests only.',
  OPERATIONS: 'Inventory operations, test drives, inspections, valuations, sell requests, and vehicle handover.',
  CONTENT_MANAGER: 'Published testimonials, gallery, website content, newsletter, and non-secret settings visibility.',
  ADMIN: 'Dealership administration; protected Super Admin controls remain restricted.',
  SUPER_ADMIN: 'Full application administration, including protected staff and security controls.',
}

export default async function AccessMatrixPage() {
  const actor = await requirePermission('dashboard.view')
  const canManageStaffRoles = hasPermission(actor.role, 'user.role.manage')

  return <>
    <AdminPageHeader
      title="Roles & Access Matrix"
      breadcrumb="Overview / Roles & Access"
      text="Read the server-enforced application permissions for each account role. Role changes remain subject to staff lifecycle safeguards."
      actions={canManageStaffRoles ? <Link className="admin-button admin-button--secondary" href="/admin/users">Manage staff roles</Link> : undefined}
    />
    <section className="admin-panel access-matrix-notice" aria-label="Permission model limits">
      <h2>How access is managed</h2>
      <p>This matrix reflects the permission policy currently deployed in the codebase. It is read-only; changing grants requires a reviewed code change. Staff role assignment is available only to authorized administrators in the staff directory.</p>
      <p><strong>Branch scope:</strong> SALES, OPERATIONS, and CONTENT_MANAGER access to scoped administrative records is limited to active showroom assignments; operational leads also follow assigned/unassigned queue rules. ADMIN and SUPER_ADMIN remain organization-wide across showrooms. This application models one organization, not organization-level tenancy, and the remaining direct record paths still require audit.</p>
    </section>
    <section className="admin-panel access-matrix-section" aria-label="Role descriptions">
      <h2>Role definitions</h2>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <caption>{roles.length} account roles in the existing application model</caption>
          <thead><tr><th scope="col">Role</th><th scope="col">Description</th><th scope="col">Granted permissions</th></tr></thead>
          <tbody>{roles.map((role) => <tr key={role}>
            <th scope="row">{role.replaceAll('_', ' ')}</th>
            <td>{roleDescriptions[role]}</td>
            <td>{adminPermissions.filter((permission) => hasPermission(role, permission)).length}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </section>
    <section className="admin-panel access-matrix-section" aria-label="Permission matrix">
      <h2>Permission matrix</h2>
      <div className="admin-table-wrap">
        <table className="admin-table access-matrix-table">
          <caption>Check marks indicate server-side grants. An empty cell indicates the operation is denied.</caption>
          <thead><tr><th scope="col">Permission</th>{roles.map((role) => <th scope="col" key={role}>{role.replaceAll('_', ' ')}</th>)}</tr></thead>
          <tbody>{adminPermissions.map((permission) => <tr key={permission}>
            <th scope="row"><code>{permission}</code></th>
            {roles.map((role) => <td key={role} aria-label={`${role}: ${hasPermission(role, permission) ? 'granted' : 'denied'}`}>
              {hasPermission(role, permission) ? <span className="access-matrix-granted" aria-label="Granted">Yes</span> : <span className="access-matrix-denied" aria-label="Denied">—</span>}
            </td>)}
          </tr>)}</tbody>
        </table>
      </div>
    </section>
  </>
}
