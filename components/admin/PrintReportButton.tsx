'use client'

export function PrintReportButton() {
  return <button type="button" className="admin-button" onClick={() => window.print()}>
    Print / Save PDF
  </button>
}
