import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AdminPageHeader, AdminStatus } from '@/components/admin/AdminPrimitives'
import { PrintReportButton } from '@/components/admin/PrintReportButton'
import { requirePermission } from '@/lib/auth/require-permission'
import { isFinalInspection } from '@/lib/inspection/report'
import { getStaffInspectionReport } from '@/lib/inspection/report-service'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePermission('vehicle.update')
  const { id } = await params
  const report = await getStaffInspectionReport(id, actor)
  if (!report) notFound()
  const finalized = isFinalInspection(report.status)
  return <>
    <AdminPageHeader title="Vehicle Inspection Report"
      text={report.vehicle.stockNumber + ' · ' + report.vehicle.shortTitle}
      breadcrumb="Inspections / Report"
      actions={<><Link className="admin-button admin-button--secondary" href={`/admin/inspections/${id}`}>Inspection details</Link>
        {finalized ? <PrintReportButton /> : null}</>} />
    {!finalized ? <p className="admin-form-message is-error" role="status">This inspection has not been reviewed. The printable report is locked until an administrator approves or rejects it.</p> :
      <article className="admin-panel admin-panel--full inspection-print-report" id="inspection-print-report">
        <header><h2>Vehicle condition report</h2><AdminStatus value={report.status} /></header>
        <div className="admin-panel__body">
          <p><strong>Vehicle:</strong> {report.vehicle.shortTitle} · {report.vehicle.stockNumber}</p>
          <p><strong>Inspector:</strong> {report.inspector.name} · <strong>Reviewer:</strong> {report.reviewer?.name ?? 'Not recorded'}</p>
          <p><strong>Submitted:</strong> {report.submittedAt?.toLocaleString('en-IN') ?? 'Not recorded'}</p>
          <p><strong>Reviewed:</strong> {report.reviewedAt?.toLocaleString('en-IN') ?? 'Not recorded'}</p>
          <p><strong>Results:</strong> {report.summary.completed}/{report.summary.total} checked,
            {' '}{report.summary.failures} failures, {report.summary.criticalFailures} critical failures.</p>
          {report.reviewNote ? <p><strong>Reviewer notes:</strong> {report.reviewNote}</p> : null}
          <p>This staff inspection report documents recorded evidence only. It does not establish legal title, warranty, certification or authorization to publish.</p>
          <table className="admin-table">
            <caption>Recorded vehicle condition checks</caption>
            <thead><tr><th>Category</th><th>Check</th><th>Result</th><th>Remarks</th></tr></thead>
            <tbody>{report.checks.map((check) => <tr key={check.code}>
              <td>{check.category === 'RoadTest' ? 'Road Test' : check.category}</td>
              <td>{check.label}{check.critical ? ' (critical)' : ''}</td>
              <td>{check.result.replaceAll('_', ' ')}</td>
              <td>{check.remarks ?? '—'}</td>
            </tr>)}</tbody>
          </table>
          <h3>Private evidence manifest ({report.evidence.length})</h3>
          <p>Evidence files require an authorized staff session and are not embedded in public-facing documents.</p>
          {report.evidence.length ? <ul>{report.evidence.map((item) => <li key={item.id}>
            {item.checkCode}: <Link href={`/api/admin/inspections/${encodeURIComponent(report.id)}/evidence/${encodeURIComponent(item.id)}`}>{item.originalName}</Link>
          </li>)}</ul> : <p>No private evidence attached.</p>}
          <p><small>Report reference: {report.id}. Generated from the recorded review; historical records are not modified by printing.</small></p>
        </div>
      </article>}
  </>
}
