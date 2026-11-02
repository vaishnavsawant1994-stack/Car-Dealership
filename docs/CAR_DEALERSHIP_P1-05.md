# P1-05 — Roles & Access Matrix

**Status: initial implementation slice started on `codex/p1-05-role-access-matrix`, based on local Phase 1 integration commit `119b34623e2e045f9b8ca674ab37f32a018276f6`. Draft work only; no PR, merge, staging migration, or deployment.**

## Scope and source of truth

The master execution prompt and the P1-04 handoff both identify P1-05 as Roles & Access Matrix. An older P1-01 foundation mapping calls P1-05 “Sessions”; treat that mapping as stale for this sequence. P1-05 reuses the existing Prisma `UserRole`, `adminPermissions`, server authorization helpers, and protected staff lifecycle. It does not introduce new role names or a second permission store.

The initial slice makes the current role grants visible in the staff application and adds exhaustive contract tests for the existing role matrix and resource-policy helpers. The access page is read-only; it links to the existing protected staff-role workflow where the actor is authorized. Permission grants themselves remain code-reviewed policy.

## Existing authorization model

- Server pages and APIs enforce permissions through `requirePermission` and `authorizeAdminRequest`.
- Lead-like resources use assigned-to-self/unassigned rules for focused roles; `ADMIN` and `SUPER_ADMIN` can access across queues.
- Ordinary `ADMIN` cannot manage `SUPER_ADMIN` accounts. A Super Admin cannot modify their own protected account through the staff lifecycle.
- Private sell-request documents are limited to Operations and administrator roles.
- Staff status and role changes use the existing versioned lifecycle, transactional audit, and session invalidation.

## Limits that remain open

- P1-03 showroom assignments currently record operational membership. The schema does not yet associate vehicle and customer-operation records with an organization/showroom scope, so they do not establish complete row-level tenant or branch isolation.
- This slice does not add runtime-editable permission grants. A later approved data model would need migration, privilege-boundary review, change audit, and rollback design before grants could be edited in the UI.
- Full per-role browser journeys, branch-scoped fixtures, and cross-organization denial tests remain required before this module can be accepted.
- The branch is based on locally integrated P1-01–P1-04 preview commits whose upstream PRs remain unmerged. Rebase or reconcile only after those reviewed PRs are integrated; do not merge this branch into `main` or deploy it ahead of those gates.

## Current evidence

- No database schema change or hosted resource mutation is part of the initial slice.
- `npm.cmd test -- lib/auth/admin-permissions.test.ts lib/auth/admin-resource-policy.test.ts` — **2 files, 20 tests passed**. The suite checks all existing role/permission combinations, lead assignment access, protected user management, and private-document access.
- `npm.cmd run lint` — **passed**.
- `npm.cmd run typecheck` — **passed**.
- `npm.cmd run build` — **exit 0**, including `/admin/access-matrix`. Static generation emitted three database-unavailable messages for `contentBlock.findFirst` against the isolated loopback test URL; this confirms compilation only and leaves database-backed runtime smoke verification open.
- Locked dependencies installed with `npm.cmd ci`; no lockfile changes. The install reported **15 dependency audit findings** (7 moderate, 7 high, 1 critical); no automatic dependency changes were applied.

## Acceptance still required

Run the full unit and isolated PostgreSQL integration suites, typecheck, lint, production build, and authenticated E2E matrix; add or verify organization/showroom row scopes; obtain independent review; reconcile the base branch; then prepare a draft PR with exact-head CI. No role assignment, policy grant, migration, deployment, or P0 release gate is accepted by this development slice.
