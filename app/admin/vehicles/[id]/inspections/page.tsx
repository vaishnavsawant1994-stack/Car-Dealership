import { UserRole } from '@prisma/client'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AdminEmpty, AdminPageHeader, AdminStatus } from '@/components/admin/AdminPrimitives'
import { requirePermission } from '@/lib/auth/require-permission'
import { prisma } from '@/lib/db/prisma'
import { isFinalInspection } from '@/lib/inspection/report'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePermission('vehicle.update')
  const { id } = await params
  const vehicle = await prisma.vehicle.findUnique({
    where: { id }, select: { id: true, shortTitle: true, stockNumber: true },
  })
  if (!vehicle) notFound()
  const manager = actor.role === UserRole.ADMIN || actor.role === UserRole.SUPER_ADMIN
  const inspections = await prisma.vehicleInspection.findMany({
    where: { vehicleId: id, ...(manager ? {} : { inspectorId: actor.id }) },
    take: 100,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: {
      id: true, status: true, createdAt: true, reviewedAt: true,
      inspector: { select: { name: true } }, reviewer: { select: { name: true } },
      _count: { select: { checks: true } },
    },
  })
  return <>
    <AdminPageHeader title="Vehicle Condition History" text={vehicle.stockNumber + ' · ' + vehicle.shortTitle}
      breadcrumb="Vehicles / Condition History"
      actions={<Link className="admin-button admin-button--secondary" href={`/admin/vehicles/${id}`}>Vehicle details</Link>} />
    {inspections.length ? <div className="admin-table-wrap"><table className="admin-table">
      <caption>{inspections.length} recent accessible inspections (maximum 100)</caption>
      <thead><tr><th>Created</th><th>Inspector</th><th>Status</th><th>Checks</th><th>Reviewed</th><th>Report</th></tr></thead>
      <tbody>{inspections.map((row) => <tr key={row.id}>
        <td><time dateTime={row.createdAt.toISOString()}>{row.createdAt.toLocaleDateString('en-IN')}</time></td>
        <td>{row.inspector.name ?? 'Staff member'}</td>
        <td><AdminStatus value={row.status} /></td>
        <td>{row._count.checks}</td>
        <td>{row.reviewedAt ? row.reviewedAt.toLocaleDateString('en-IN') : 'Pending'}</td>
        <td><Link href={isFinalInspection(row.status) ? `/admin/inspections/${row.id}/report` : `/admin/inspections/${row.id}`}>
          {isFinalInspection(row.status) ? 'Final report' : 'Open inspection'}</Link></td>
      </tr>)}</tbody>
    </table></div> : <AdminEmpty title="No accessible inspection history" text="Condition inspections will appear here after staff record them." />}
  </>
}
