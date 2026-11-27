# P1-04 — Staff Directory & Account Lifecycle

**Status: feature implementation prepared in stacked PR on P1-03; draft and CI review required. No live deployment.**

## Reused architecture

The existing `User`, `StaffInvitation`, `Session`, `AdminPreference`, `ShowroomStaffAssignment`, `AuditLog`, `NextAuth` and role permissions remain the single sources of truth. There is NO new employee table, parallel permission model or schema migration in P1-04. This PR is stacked on P1-03 because the staff assignment relation is defined there.

## Staff directory and profiles

- `/admin/users` now shows only staff, not customer accounts. Search filters by name, role, email or assigned showroom. Desktop table and mobile staff cards share the existing dark/gold styling.
- Role/status controls are visible only when the current actor has permission to perform the specific change. Super Admin role changes require `user.role.manage`; ordinary Admin can change eligible staff status but cannot promote roles.
- `/admin/users/[id]` shows the staff profile, verification/login timestamps, linked showroom assignments, limited audit activity and session generation. Existing `/admin/profile` remains the authenticated self-service profile editing screen.
- Each account's showroom membership links to the canonical P1-03 showroom roster. No new branch, employee identity or membership model is introduced.

## Lifecycle state machine

- `PATCH /api/admin/users/[id]` requires an allowlisted role or status and a positive `version` equal to the current `sessionVersion` (CAS). Unrecognized/extra fields, customer role, stale revision and no-ops are rejected.
- On *every* actual role or status change, a SERIALIZABLE transaction performs the permission/last-superadmin checks, increments `sessionVersion`, deletes stored login sessions, removes inappropriate showroom memberships (suspension, disablement, global superadmin), and creates an audit record. Any failed step rolls back all changes.
- JWT sessions are invalidated by the existing session-version check in NextAuth. Status changes and role changes now revoke active login generations.
- All self-demotion/self-disable operations are blocked, and the last active Super Admin may not be disabled or demoted.
- Disabled/unverified/passwordless users cannot simply be marked ACTIVE. Hosted staging/demo/preview accounts require the independently approved P0-06 provisioning workflow; this staff editor never provisions demo administrators.
- Revocation endpoint `POST /api/admin/users/[id]/revoke-sessions` now applies protected-account checks and performs revocation + audit in the same transaction; ordinary admins cannot revoke Super Admin accounts.

## Invitation lifecycle

- Existing one-time token, Argon2id acceptance, invitation expiry and rate limits remain. Staff must set their own secret through the existing acceptance workflow.
- `GET /api/admin/staff-invitations` returns only safe metadata (no token hashes), hiding ADMIN-level invitations from non-Super Admin users.
- `POST /api/admin/staff-invitations/[id]/revoke` atomically revokes unused/unexpired invitations with an audit record. Already consumed, expired or revoked invitations cannot be reused.
- The existing invitation POST refuses duplicate active links and restricts ADMIN invitation roles to the Super Admin. A development-only preview link remains restricted to the local development environment; hosted new invitations stay disabled.
- `/admin/users/invite` shows invitation list, status, revoke controls, and an approved non-hosted invitation form; demo routes display the explicit messaging restriction.

## Tests

- Pure tests verify allowed role/status transitions, revision schema, refusal of customer/stale/self edits, activation prerequisites, invitation role restrictions.
- Disposable PostgreSQL integration tests exercise real CAS writes, session invalidation, assignment cleanup, audit atomicity, protected session revocation and invitation replay/revoke policies.
- CI must pass lint, TypeScript, full test suite and P1-03 migration on an isolated `car_dealership_test` database.

## Explicit limits and release dependencies

- This work does NOT authorize real staff invitations, outbound messaging, external data or payments. Existing hosted P0-06 admin provisioning remains incomplete; no authenticated browser acceptance is claimed.
- Staff-to-showroom links are operational associations only, **not complete row-level vehicle/lead tenant isolation**. Do not describe them as multi-tenant permissions.
- P1-03 PR #10 supplies the required relationship; review P1-03 before merging this stacked PR. P1-02 PR #9 is an independent draft and must be reconciled separately.
- No staging or demo schema migration, merge, credentials, or deployment has been performed as part of this stage.

**Next:** P1-05 Roles & Access Matrix — build end-to-end role and resource boundary checks without changing the current approved permission model.
