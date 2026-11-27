# P1-01 — Core Foundation Route and Permission Contracts

2026-11-01. Implementation: independent draft PR only, no staging or demo deployment.

This package begins P1 Core Foundation without duplicating existing frontend, backend or database entities. It inventories 12 actual admin API modules and the current UI route ownership.

Checks enforced by the new unit tests:
- Existing admin page and API route files remain present.
- Every inventoried handler performs server-side authorization using the required permission.
- No handler is assigned to two foundation work packages.
- CUSTOMER cannot access any staff administration operation; SUPER_ADMIN can.
- SALES does not get system configuration, staff management, audit or captured-email access.

Foundation work mapped: P1-01 Dashboard/Profile, P1-03 Showrooms, P1-04 Staff, P1-05 Sessions, P1-06 Settings, P1-07 Notifications, P1-08 Audit, P1-10 Email Capture.

Run npm test on the exact PR head. This is source-level contract coverage, NOT a completed authenticated hosted-login acceptance test. Other P1 feature work remains separate and unimplemented.

P0-06 remains open. P0-07 PR #4 and P0-08 PR #7 are independent. No new credential, migration, message integration, billing system or production deployment is introduced.
