# P3-02 — Inspection Reports and Vehicle Condition History

**Development status:** Feature PR stacked on P3-01. Not merged or deployed.

## Implemented

- A private, staff-authenticated and permission-scoped report endpoint: GET /api/admin/inspections/[id]/report.
- JSON export is available only when the inspection is APPROVED or REJECTED; drafts and pending reviews return a deterministic 409. Unauthorized records return 404.
- Strict Prisma field projection includes only vehicle summary, inspector/reviewer names, audit timestamps, conclusion and canonical 43 checks. No seller identity, phone numbers, email, arbitrary database metadata or unapproved attachments.
- Printable HTML report at /admin/inspections/[id]/report, with A4-friendly styles and browser Print / Save PDF. Print runs client-side; no HTML injection or untrusted external PDF service.
- Vehicle condition history page at /admin/vehicles/[id]/inspections; privileged administrators see history, operators see only their own inspections. History reads are bounded to 100 recent records.
- Report links in inspection details and vehicle details, accessible without weakening Vercel SSO.
- Pure tests cover report export finalization, canonical check order, omitted unknown codes, summary failures and critical-check tallies.

## Security / evidence limitations

- Reports are operational internal records, not proof of legal title, warranty, certification or regulatory compliance.
- After APPROVED/REJECTED, the P3-01 service prevents further checklist edits, but database administrators with elevated direct DB access could still alter records; this is not claimed as cryptographically tamper-proof.
- Browser PDF output is produced by the user's print dialog. No separate signed PDF document or external PDF-generation infrastructure is added.
- Photo evidence, digital signatures, repair estimates and approvals outside the existing staff role model remain future Phase 3 work.
- Keep staging protected; do not turn on messaging, payments, or client-demo deployment until acceptance.
