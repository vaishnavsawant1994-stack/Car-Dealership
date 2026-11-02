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
- The migration leaves the new showroom foreign keys nullable for migration-before-seed compatibility. It backfills existing data to the active primary showroom and aborts if operational records exist without one. It was applied and verified against a disposable local PostgreSQL 16 CI-style database; it has not been applied to staging.
- This slice does not add runtime-editable permission grants. A later approved data model would need migration, privilege-boundary review, change audit, and rollback design before grants could be edited in the UI.
- Full per-role browser journeys, explicit migration backfill/abort edge-case tests, and cross-organization denial tests remain required before this module can be accepted.
- The branch is based on locally integrated P1-01–P1-04 preview commits whose upstream PRs remain unmerged. Rebase or reconcile only after those reviewed PRs are integrated; do not merge this branch into `main` or deploy it ahead of those gates.

## Current evidence

- No hosted resource was mutated. A local schema/migration change is now included; the migration has not been applied to staging.
- `npm.cmd test -- lib/auth/admin-permissions.test.ts lib/auth/admin-resource-policy.test.ts lib/admin/scoped-query.test.ts` — **3 files, 24 tests passed**. Tests cover role grants, lead policy, user management, private-document policy and preserving separate OR filters.
- Full `npm.cmd test` with an isolated disposable PostgreSQL 16 container on loopback, after applying all 10 migrations and running the CI fixture seed: **26 files passed, 143 tests passed, 0 failed**. The first attempt exposed three integration fixtures missing showroom scope and one loopback guard that rejected `127.0.0.1`; fixtures/guard were corrected and the full suite rerun successfully. No staging or production database was used.
- Follow-up write-scope audit found specialist test-drive, inspection, and valuation writes checked scoped access before mutation but did not repeat showroom/assignment predicates in their database writes. The shared authorization policy now supplies the same showroom and assignment predicate to lead updates, assignment changes, test-drive scheduling, inspections, and valuations; test-drive conflict detection checks all records in the actor's showroom without disclosing details. Database-backed SALES denial coverage exercises both the contact-lead collection/detail HTTP handlers and service reads/writes for records in another showroom or assigned to another staff member in the actor's showroom, while confirming an allowed same-showroom unassigned lead remains visible. The full PostgreSQL-backed suite passed **27 files, 149 tests** before these final route-handler assertions. The updated focused PostgreSQL run passed **1 file, 8 tests** after all 10 migrations and CI fixture seeding. `npm.cmd run lint` and `npm.cmd run typecheck` passed with the route-handler assertions present. The disposable test container was stopped and removed.
- A subsequent detail-read audit found that unauthorized same-showroom leads were fetched with nested customer, inspection, and valuation fields before a post-query assignment check returned 404. Detail reads now apply both showroom and assigned/unassigned queue predicates in the database query, retaining the post-query access check as defense in depth. `lib/admin/lead-service.test.ts` verifies this for all four lead types; `lib/admin/dashboard.test.ts` covers SALES pipeline scope and ADMIN audit access. The complete local non-integration suite passed **23 files, 122 tests** using an unreachable loopback test URL (no database connection). A default-timeout full database run passed 153 tests but two customer-account tests exceeded Vitest's 5-second limit in this slow local Docker environment. The full CI-style rerun applied all 10 migrations, ran the CI seed, and passed **29 files, 155 tests** with `npm.cmd test -- --testTimeout=30000`; the focused lead-route and customer-account integration tests also passed **11/11** at that timeout. Lint, typecheck and `git diff --check` passed. This is local test evidence only; all P1-05 changes remain unpushed, unmerged, unmigrated to staging and undeployed.
- The new admin API authorization contract dynamically inventories all 62 `app/api/admin/**/route.ts` files and checks every exported method has exactly one direct permission guard, or delegates exclusively to one of the shared secured lead handlers. The shared lead handler test verifies view/update/assignment permission checks. Focused contract suite: **1 file, 2 tests passed**.
- `npm.cmd run lint` — **passed**.
- `npm.cmd run typecheck` — **passed after regenerating Prisma Client**.
- `npm.cmd exec prisma validate` — **passed**.
- `npm.cmd exec prisma migrate status` against the disposable local database — **10 migrations found; database schema is up to date**.
- `npm.cmd run build`: exit 0 with ephemeral test-only auth values, including `/admin/access-matrix`. Static generation logged three database-unavailable `contentBlock.findFirst` messages against loopback `127.0.0.1:55432`; this verifies compilation/page generation, not database runtime.
- Locked dependencies installed with `npm.cmd ci`; no lockfile changes. The install reported **15 dependency audit findings** (7 moderate, 7 high, 1 critical); no automatic dependency changes were applied.

## Dashboard scope and outage behavior follow-up (2026-11-02)

A final dashboard scope audit found that Sales and Operations roles could trigger and see global draft testimonial/gallery totals without the corresponding content permissions. The database-error fallback also returned hard-coded customer and staff rows without applying the actor's showroom or assignment scope. The dashboard now queries each content count only for roles with its matching permission, omits unauthorized counts in the UI, and returns an explicit unavailable state with empty data instead of fabricated rows. The unused global newsletter-subscriber count query was removed.

- `npm.cmd test -- lib/admin/dashboard.test.ts` — **1 file, 4 tests passed**, including role-gated content queries and empty fallback on DB failure.
- Full CI-style local PostgreSQL suite against an isolated PostgreSQL 16 container, after all 10 migrations and CI seed: `npm.cmd test -- --testTimeout=30000` — **29 files, 157 tests passed**.
- `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd exec prisma validate`, and `npm.cmd run build` — **passed**. The build ran the isolation preflight with test-only environment values and generated 123 static pages. No hosted database or deployment was used.
- The test container was local and disposable; no Vercel/Neon staging state was changed. These changes remain unpushed and unmerged pending Phase 1 dependency reconciliation and review.

## Acceptance still required

Run the authenticated E2E matrix; finish the resource-query and derived-child data-scope audit beyond the automated route guard contract; obtain independent review; reconcile the base branch; then prepare a draft PR with exact-head CI. Do not apply the migration or deploy this draft before those code and review gates are satisfied. No role assignment, policy grant, or P0 release gate is accepted by this development slice.
