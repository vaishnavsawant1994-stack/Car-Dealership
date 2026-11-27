# P3-01 — Vehicle Condition Inspection & Review

**Status:** Feature implementation pending exact-head CI, peer review, integration and protected staging acceptance.

## Staff workflow

1. A staff member with vehicle.update opens /admin/inspections or selects Inspections from a vehicle record.
2. Start/resume creates at most one active inspection per vehicle. The database partial unique index enforces one active DRAFT, IN_PROGRESS or READY_FOR_REVIEW record even under concurrency.
3. An inspector records results and notes against 43 fixed checks in Documents, Exterior, Mechanical, Chassis, Interior and Road Test. Saving is optimistic-versioned; stale writes return 409.
4. Submission requires all checks to have a result and an explanation for each failed check. Submission locks editing and writes an audit event.
5. An administrator with vehicle.publish may approve or reject a submitted inspection **only if they are not its inspector**. Approval requires all checks passing or not applicable; rejection requires a written reason. The server service independently enforces the administrator role and separation of duties, not just the UI.
6. A review is immutable, preserving the checklist, inspector/reviewer, timestamps, reasons and audit events. A new inspection can be initiated for subsequent cycles.
7. An approved inspection **does not** automatically certify, publish, price or sell the vehicle. The existing publishing checks are independent.

## Data model

- VehicleInspection: inspector, reviewer, lifecycle, version, timestamps and review note.
- VehicleInspectionCheck: unique (inspectionId, code), categorized result and remarks.
- Explicit foreign keys and indexes; no PII or customer data copied into inspection records.
- Migration lives in prisma/migrations/20261114170000_vehicle_inspection_checklist/migration.sql.
- Restricted staff inspection API is private and no-store, and inspection listings are scoped to the current operator unless admin.

## Acceptance

- Exact-head CI: Prisma generate, isolated Postgres migrations/seed, lint, typecheck, unit and DB integration tests, build.
- Test incomplete/failed conditions, stale writes, user ownership, different-user review, immutable submissions, no automatic publish.
- Confirm staff desktop/mobile interaction, focus and accessible labels on protected staging after release gates are resolved.
- No staging database migration, customer notification, outbound messaging or client-demo deployment is authorized by this feature branch.

## Further Phase 3 scope

Evidence/photo attachments, downloadable immutable inspection reports, condition trends and repair cost/quality controls remain separately planned. Do not imply they already exist because P3-01 passes CI.
