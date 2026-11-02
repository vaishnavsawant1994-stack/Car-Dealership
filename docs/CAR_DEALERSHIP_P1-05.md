- Full `npm.cmd test`: 19 files passed (106 tests); 7 database-backed suites failed before tests ran because this worktree has no DATABASE_URL or local isolated PostgreSQL service. No staging or production database was used.
# P1-05 — Roles & Access Matrix

**Status: in progress on `codex/p1-05-role-access-matrix`, based on local Phase 1 integration commit `119b34623e2e045f9b8ca674ab37f32a018276f6`. Draft work only; no PR, merge, staging migration, or deployment.**

## Scope and source of truth

The master execution prompt and the P1-04 handoff both identify P1-05 as Roles & Access Matrix. An older P1-01 foundation mapping calls P1-05 “Sessions”; treat that mapping as stale for this sequence. P1-05 reuses the existing Prisma `UserRole`, `adminPermissions`, server authorization helpers, and protected staff lifecycle. It does not introduce new role names or a second permission store.

The slice makes current role grants visible in the staff application and adds contract tests for the existing role matrix and resource-policy helpers. The access page is read-only; it links to the existing protected staff-role workflow where authorized. Permission grants remain code-reviewed policy. It also adds showroom IDs to vehicles, inquiries, test drives, sell requests and contact messages, a backfill migration, active staff/showroom lookup, and scope predicates for lead queues/detail/actions, vehicle admin API/page paths, dashboard lead and inventory metrics, exports, and new public lead creation.

## Existing authorization model

- Server pages and APIs enforce permissions through `requirePermission` and `authorizeAdminRequest`.
- Focused operational roles see records in their active showroom assignments and only their assigned/unassigned queue. `ADMIN` and `SUPER_ADMIN` are organization-wide within the single organization modeled by this application.
- Ordinary `ADMIN` cannot manage `SUPER_ADMIN` accounts. A Super Admin cannot modify their own protected account through the staff lifecycle.
- Private sell-request documents are limited to Operations and administrator roles.
- Staff status and role changes use the existing versioned lifecycle, transactional audit, and session invalidation.

## Limits that remain open

- This is showroom/branch scoping within one organization, not multi-tenant organization isolation. Admins intentionally have organization-wide access. Every remaining direct record access and derived child resource must be audited before acceptance.
- The migration leaves the new showroom foreign keys nullable for migration-before-seed compatibility. It backfills existing data to the active primary showroom and aborts if operational records exist without one. Database execution and post-migration verification have not been performed in this worktree.
- This slice does not add runtime-editable permission grants. A later approved data model would need migration, privilege-boundary review, change audit, and rollback design before grants could be edited in the UI.
- Full per-role browser journeys, isolated PostgreSQL migration/backfill tests, branch-scoped fixtures, and cross-organization denial tests remain required before this module can be accepted.
- The branch is based on locally integrated P1-01–P1-04 preview commits whose upstream PRs remain unmerged. Rebase or reconcile only after those reviewed PRs are integrated; do not merge this branch into `main` or deploy it ahead of those gates.

## Current evidence

- No hosted resource was mutated. A local schema/migration change is now included; the migration has not been applied to staging.
- `npm.cmd test -- lib/auth/admin-permissions.test.ts lib/auth/admin-resource-policy.test.ts lib/admin/scoped-query.test.ts` — **3 files, 24 tests passed**. Tests cover role grants, lead policy, user management, private-document policy and preserving separate OR filters.
- `npm.cmd run lint` — **passed**.
- `npm.cmd run typecheck` — **passed after regenerating Prisma Client**.
- `npm.cmd exec prisma validate` — **passed**.
- `npm.cmd run build` — **exit 0**, including `/admin/access-matrix`. Static generation emitted three database-unavailable messages for `contentBlock.findFirst` against the isolated loopback test URL; this confirms compilation only and leaves database-backed runtime smoke verification open.
- Locked dependencies installed with `npm.cmd ci`; no lockfile changes. The install reported **15 dependency audit findings** (7 moderate, 7 high, 1 critical); no automatic dependency changes were applied.

## Acceptance still required

Run the isolated PostgreSQL integration suites, finish production build verification, and run the authenticated E2E matrix; complete the route-by-route authorization audit; obtain independent review; reconcile the base branch; then prepare a draft PR with exact-head CI. Do not apply the migration or deploy this draft before those code and review gates are satisfied. No role assignment, policy grant, or P0 release gate is accepted by this development slice.
