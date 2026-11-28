# P2-03 — Controlled Procurement to Inventory Draft Conversion

**Status:** Feature branch stacked onto P2-02/P2-01; no live data, payment processing, external messaging, migration deployment, or publication.

## Purpose

Once an authorized operator has completed the canonical seller acquisition lifecycle, create a **single unpublished** inventory draft from validated vehicle specifications, while preserving seller history in the original SellRequest.

## Implemented

- Database migration adds optional unique Vehicle.procurementRequestId referencing canonical SellRequest, with a named ProcurementVehicle relation. No existing vehicle or sell-request records are backfilled or changed.
- The /admin/procurement/[id]/convert page reuses the vehicle editor with safe make/model/year/mileage prefill, not seller contact information or private documents.
- POST /api/admin/procurement/[id]/convert requires vehicle.create, sellRequest.complete, sellRequest.inspect, an accessible seller intake and a current optimistic version.
- The source status must be COMPLETED, inspection must be finalized with documents verified and an overall score, and a final seller acquisition offer must have been recorded.
- A serializable Prisma transaction checks source evidence, uses a compare-and-swap version update, creates an unpublished VehicleStatus.DRAFT, inserts feature links and an audit record, then commits atomically. Any failure rolls everything back.
- Unique source link blocks duplicate conversion. Creating a draft does **not** publish it, confirm title transfer, verify regulatory compliance, send external communications or make a payment.
- HTTP responses distinguish forbidden access, not found, stale version, incomplete evidence, duplicate source, validation errors and invalid foreign keys.
- Database-backed integration tests create isolated fictional SellRequest, inspection, valuation and vehicle fixtures, assert unpublished state and audit evidence, check CAS and duplicate behavior, and clean the fixture. Separate unit tests cover evidence gate failures.

## Migration and release

Run the ordinary Prisma migration/test workflow against an isolated local/CI PostgreSQL database. Never run the migration directly on live staging until the stacked branch is reconciled, reviewed, and approved. Existing main remains unchanged.

P2-03 must not be merged before its parent PR #22 (P2-02) and PR #21 (P2-01). Branch permissions and actual legal acquisition evidence need future review with the broader P1-05 boundary model. Historical credential exposure response and live secure administrator recovery remain release gates. The repository stays public at the owner's direction.

## Product limitations

- COMPLETED reflects the existing operator-managed seller workflow; this does not independently verify legal ownership or physical delivery.
- The procurement amount is not automatically treated as the sale/list price. Staff must enter correct resale pricing explicitly.
- Conversion does not generate accounting vouchers or buyer invoices. Those belong in finance/billing phases.
- An acquired seller vehicle remains invisible publicly until standard inventory publication, image and authorization gates pass.
