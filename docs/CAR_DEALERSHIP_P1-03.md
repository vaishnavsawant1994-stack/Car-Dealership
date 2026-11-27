# P1-03 — Branch & Showroom Management

**2026-11-01 — development implementation proposed; live deployment not authorized.**

## Architecture

The existing `Showroom` is the authoritative branch record. P1-03 does not create an unrelated `Branch` table or duplicate address/company data in `SiteSetting`. A narrow `ShowroomStaffAssignment` join table associates existing staff `User` records with one or more existing showrooms; a `(showroomId,userId)` unique index prevents duplicate memberships. `Showroom.version` adds optimistic concurrency.

**Migration:** `20261101121500_showroom_staff_assignments` — adds a showroom version, the join table, unique/index constraints and foreign keys with `ON DELETE RESTRICT`. This requires a controlled migration deployment and is **not** applied to any hosted database by this feature PR. GitHub CI executes it only against disposable `car_dealership_test`.

## Screens

- `/admin/showrooms`: existing showroom manager extended with active/primary status, staff counts and links to a branch roster. Editing includes version and clear conflicts. Uses existing dark/gold responsive admin layout.
- `/admin/showrooms/[id]`: linked detailed edit route.
- `/admin/showrooms/[id]/staff`: active staff roster, search and assignment, removal, ineligible/inactive errors. Only authorised showroom managers.
- `/admin/my-showrooms`: personal read-only active showroom summaries, scoped by current `actor.id`; available to staff with `dashboard.view`. No other staff PII or cross-branch records.

## Backend

- `GET/POST /api/admin/showrooms` and `GET/PATCH /api/admin/showrooms/[id]`: existing API contract retained with `showroom.manage` permission. PATCH now requires `version`, returns 409 on stale updates; create/edit/audit are in one serializable transaction.
- `GET/POST /api/admin/showrooms/[id]/staff` and `DELETE /api/admin/showrooms/[id]/staff/[userId]`: `showroom.manage` only, staff eligibility checks, unique membership enforcement and atomic audit events.
- `GET /api/admin/my-showrooms`: `dashboard.view`, only own assignments and active showrooms, no private user information.
- Only active STAFF roles `SALES`, `OPERATIONS`, `CONTENT_MANAGER`, `ADMIN` can be assigned; `CUSTOMER`, disabled/deleted users and `SUPER_ADMIN` (global role) are excluded. Staff assignment does **not** grant any extra route permissions.
- Primary showroom must be active. Transferring primary marks the previous primary non-primary and increments its version. A primary showroom cannot be demoted directly; select a different active primary instead. Deactivation requires removing all staff assignments first.
- Hosted staging/demo/preview name and email values remain explicitly fictional (`Demo`, reserved `.test`); real phone numbers, WhatsApp URLs and external map links are blocked. No real communications or payments are enabled.

## CI evidence and accepted limits

- Unit tests cover role rules, hosted-safety validation, client request schemas, explicit route permission contracts.
- Isolated local PostgreSQL integration tests cover staff relationships, duplicate denial, forbidden roles, user scoping, revision conflicts, atomic updates, audit events and deactivation safety.
- Browser-level authenticated staging checks remain blocked by P0-06 fictional staff provisioning. Passing CI does **not** mean the hosted page was tested.
- Branch associations are operational memberships only, not full tenant-level authorization for vehicle/lead data. Those resources still use existing assignment rules. Do not claim multi-tenant isolation until Phase 14 contracts and per-resource policies are delivered.
- The new branch management migration must not be applied to staging/demo until backups, P0-06/P0-07 acceptance and an approved release gate are complete.

## Merge dependencies

PR #9 P1-02 remains a separate draft; both touch related admin pages and have to be reconciled through reviewed integration before combining. Do not force push or deploy the new schema automatically. P0-06 Issue #3 and P0-07 Issues #5/#6 remain open.

## Next task

P1-04 — Staff Directory & Account Lifecycle, reusing existing staff, roles, invitations and session revocation. Add branch association visibility and negative authorisation tests rather than recreating staff identities.
