import { UserStatus } from '@prisma/client'
import Link from 'next/link'
import { AdminEmpty, AdminPageHeader, AdminPagination, AdminStatus } from '@/components/admin/AdminPrimitives'
import { requirePermission } from '@/lib/auth/require-permission'
import { parseCustomerFilters } from '@/lib/crm/customer-query'
import { listCustomers } from '@/lib/crm/customer-service'

export default async function Page({
  searchParams,
}: { searchParams: Promise<{ page?: string; search?: string; status?: string }> }) {
  await requirePermission('user.view')
  const filters = parseCustomerFilters(await searchParams)
  const { data, pagination } = await listCustomers(filters)
  return <>
    <AdminPageHeader title="Customer 360"
      text="Private, read-only CRM overview. Customer records are linked only through explicit account IDs; anonymous enquiries are not automatically merged."
      breadcrumb="Customers" />
    <form className="admin-filterbar" method="get">
      <label className="admin-filterbar__search">Search
        <input type="search" name="search" maxLength={120} defaultValue={filters.search}
          placeholder="Customer name, email or phone" />
      </label>
      <label>Status
        <select name="status" defaultValue={filters.status ?? ''}>
          <option value="">All statuses</option>
          {Object.values(UserStatus).map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}
        </select>
      </label>
      <button className="admin-button" type="submit">Search</button>
    </form>
    {data.length ? <>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <caption>{pagination.total} customer accounts matching filters</caption>
          <thead><tr><th>Customer</th><th>Status</th><th>Enquiries</th><th>Test drives</th><th>Sell requests</th><th>Saved vehicles</th><th>Joined</th></tr></thead>
          <tbody>{data.map((item) => <tr key={item.id}>
            <td><Link href={`/admin/customers/${item.id}`}><strong>{item.name ?? 'Unnamed customer'}</strong></Link>
              <p>{item.email}</p></td>
            <td><AdminStatus value={item.status} /></td>
            <td>{item._count.inquiries}</td><td>{item._count.testDrives}</td>
            <td>{item._count.sellRequests}</td><td>{item._count.favorites}</td>
            <td><time dateTime={item.createdAt.toISOString()}>{item.createdAt.toLocaleDateString('en-IN')}</time></td>
          </tr>)}</tbody>
        </table>
      </div>
      <div className="admin-mobile-cards">{data.map((item) => <article className="admin-mobile-card" key={item.id}>
        <header><h2>{item.name ?? 'Unnamed customer'}</h2><AdminStatus value={item.status} /></header>
        <p>{item.email}</p>
        <p>{item._count.inquiries} enquiries · {item._count.testDrives} test drives · {item._count.favorites} saved vehicles</p>
        <footer><span>Registered customer</span><Link href={`/admin/customers/${item.id}`}>View profile</Link></footer>
      </article>)}</div>
      <AdminPagination page={pagination.page} totalPages={pagination.totalPages}
        basePath="/admin/customers" params={{ search: filters.search, status: filters.status ?? undefined }} />
    </> : <AdminEmpty title="No customer accounts" text="No registered customer records match these filters." />}
  </>
}
