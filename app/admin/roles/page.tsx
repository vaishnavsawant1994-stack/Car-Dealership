import Link from 'next/link'
import { AdminPageHeader } from '@/components/admin/AdminPrimitives'
import { requirePermission } from '@/lib/auth/require-permission'
import { canManagePrivilegedRoles, effectiveRoleMatrix, groupedPermissionMatrix, managedRoles } from '@/lib/admin/role-matrix'

export default async function Page() {
  const actor = await requirePermission('user.view')
  const roles = effectiveRoleMatrix()
  const groups = groupedPermissionMatrix()
  const owner = canManagePrivilegedRoles(actor.role)
  return <>
    <AdminPageHeader title="Roles & Access Matrix"
      text="Effective, server-enforced permissions for each existing system role. This page does not create additional privileges or bypass account-lifecycle controls."
      breadcrumb="Management / Roles"
      actions={<Link className="admin-button admin-button--secondary" href="/admin/users">Staff directory</Link>} />
    <section className="admin-grid" aria-label="Role access summary">
      {roles.map((role) => <article className="admin-panel" key={role.role}>
        <header><h2>{role.role.replaceAll('_', ' ')}</h2></header>
        <div className="admin-panel__body">
          <p>{role.description}</p>
          <p><strong>{role.total}</strong> of {groups.reduce((sum, group) => sum + group.items.length, 0)} admin capabilities</p>
        </div>
      </article>)}
    </section>
    <section className="admin-panel admin-panel--full">
      <header><h2>Permission grants</h2></header>
      <div className="admin-panel__body">
        <p>These grants are derived directly from the application's centralized permission policy; changing a table cell is not a way to grant access.</p>
        <p>{owner ? 'As Super Admin, you can use the separately guarded staff lifecycle controls for approved account role changes.' :
          'This is read-only. Owner-only role assignment is not available to your account.'}</p>
        <p>Resource ownership, showroom assignment and cross-organization restrictions are additional server policies; the matrix alone does not establish multi-tenant isolation.</p>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <caption>Current backend permissions by staff and customer role</caption>
          <thead><tr><th scope="col">Capability</th>
            {managedRoles.map((role) => <th key={role} scope="col">{role.replaceAll('_', ' ')}</th>)}
          </tr></thead>
          <tbody>{groups.flatMap((group) => [
            <tr key={'module-'+group.category}>
              <th scope="rowgroup" colSpan={managedRoles.length + 1}>{group.category.toUpperCase()}</th>
            </tr>,
            ...group.items.map((item) => <tr key={item.permission}>
              <th scope="row">{item.permission}</th>
              {managedRoles.map((role) => <td key={role}>
                <span aria-label={item.grants[role] ? 'Granted' : 'Denied'}>{item.grants[role] ? 'Yes' : 'No'}</span>
              </td>)}
            </tr>),
          ])}</tbody>
        </table>
      </div>
    </section>
  </>
}
