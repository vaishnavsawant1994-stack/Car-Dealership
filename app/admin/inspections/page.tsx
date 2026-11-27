import { UserRole, VehicleInspectionStatus } from '@prisma/client'
import Link from 'next/link'
import { AdminEmpty, AdminPageHeader, AdminStatus } from '@/components/admin/AdminPrimitives'
import { InspectionStart } from '@/components/admin/InspectionStart'
import { requirePermission } from '@/lib/auth/require-permission'
import { prisma } from '@/lib/db/prisma'

export default async function Page({
  searchParams,
}: { searchParams: Promise<{ status?: string; vehicleId?: string }> }) {
  const actor = await requirePermission('vehicle.update')
  const query = await searchParams
  const allowed = Object.values(VehicleInspectionStatus)
  const status = allowed.includes(query.status as VehicleInspectionStatus) ? query.status as VehicleInspectionStatus : undefined
  const manager = actor.role === UserRole.ADMIN || actor.role === UserRole.SUPER_ADMIN
  const [records, vehicles] = await Promise.all([
    prisma.vehicleInspection.findMany({
      where: { ...(manager ? {} : { inspectorId: actor.id }), ...(status ? { status } : {}) },
      take: 100, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true, status: true, updatedAt: true,
        vehicle: { select: { stockNumber: true, shortTitle: true } },
        inspector: { select: { name: true } },
      },
    }),
    prisma.vehicle.findMany({
      orderBy: { updatedAt: 'desc' }, take: 100,
      select: { id: true, stockNumber: true, shortTitle: true },
    }),
  ])
  return <>
    <AdminPageHeader title="Vehicle Condition Inspections"
      text="Internal checklist, evidence review and inspection history. Completing an inspection does not certify or publish a vehicle."
      breadcrumb="Inspections" />
    <InspectionStart vehicles={vehicles} initialVehicleId={query.vehicleId} />
    <form className="admin-filterbar" method="get">
      <label>Status <select name="status" defaultValue={status ?? ''}>
        <option value="">All accessible inspections</option>
        {allowed.map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}
      </select></label>
      <button className="admin-button" type="submit">Filter</button>
    </form>
    {records.length ? <div className="admin-table-wrap"><table className="admin-table">
      <caption>{records.length} recent inspections shown (maximum 100)</caption>
      <thead><tr><th>Vehicle</th><th>Inspector</th><th>Status</th><th>Updated</th><th>Action</th></tr></thead>
      <tbody>{records.map((item) => <tr key={item.id}>
        <td>{item.vehicle.stockNumber} · {item.vehicle.shortTitle}</td>
        <td>{item.inspector.name ?? 'Staff member'}</td>
        <td><AdminStatus value={item.status} /></td>
        <td><time dateTime={item.updatedAt.toISOString()}>{item.updatedAt.toLocaleString('en-IN')}</time></td>
        <td><Link href={`/admin/inspections/${item.id}`}>Open inspection</Link></td>
      </tr>)}</tbody>
    </table></div> : <AdminEmpty title="No vehicle inspections" text="Create an inspection or change the status filter." />}
  </>
}
