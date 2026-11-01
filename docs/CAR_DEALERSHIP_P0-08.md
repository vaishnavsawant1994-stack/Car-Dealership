# P0-08 — Phase 0 Acceptance and Safe Transition to P1

**2026-11-01 | STATUS: BLOCKED FOR RELEASE, DEVELOPMENT MAY CONTINUE**

This phase is a documented release decision, not permission to call unfinished P0-06 or P0-07 "passed." The user explicitly chose to proceed with independent later-stage work while P0-06 is open. The Car-Dealership client demo remains undeployed.

## Evidence-driven checks

The non-secret, reviewable file `docs/release-evidence/p0-08.json` records every required gate, its owner, status and evidence link. The pure validator `lib/release/readiness.ts` and `scripts/check-phase0-readiness.ts` refuse release acceptance until all required gates are marked passed with a rationale and linked evidence.

Run:
- `npx tsx scripts/check-phase0-readiness.ts` — prints current status, exits successfully for informational use.
- `npx tsx scripts/check-phase0-readiness.ts --verify` — **expected to exit nonzero now** because required release gates are incomplete.
- `npm test` — includes tests that prove missing/unsupported evidence cannot pass and that P1 independent development remains allowed.

Evidence links are references only; verify current provider status and actual test artifacts before changing any state to "passed." Do not self-certify on the strength of this manifest.

## Current accepted independent work

- Repository isolation/visibility and separate approved Neon database fingerprints.
- Protected staging deploy with public website/API smoke checks.
- No external messaging or payment activation.
- P0-07 security source changes and regression tests under review in draft PR #4.
- Staging snapshot created and independent restored data copy checked; original staging default branch and original compute hostname were reestablished.

## Mandatory release blockers

- P0-06: fictional staff login, role boundaries, logout and authenticated vehicle image lifecycle, plus independent protected demo deployment.
- P0-07: append-only audit privileges, scheduled backups and RPO/RTO/retention, object-storage recovery, verified private-object isolation and true credential-denial tests. The non-promoting database snapshot restore is now verified and recorded under Issue #5; its restored branch contained no object-storage buckets, and no timed RTO was established.
- P0-08: approved release controls on the private repo, exact-head review of security changes and explicit recorded final acceptance.

## Monitoring follow-up (2026-11-01)

The staging project is on Vercel Hobby, with SSO protection required for every deployment. Vercel's runtime-log API reports a one-hour retention window; a recent 30-minute error/fatal count query returned no records, which does not prove alert delivery or full-period health. Observability Plus is not enabled on this team, so its configuration endpoint is unavailable. No external alert destination was added.

The app previously had a database health helper but no HTTP health route. This PR now adds an uncached Node.js `GET /api/health` endpoint that returns HTTP 200 only when a `SELECT 1` check succeeds, otherwise 503. The response includes a timestamp, latency, and a boolean status only; database driver messages are not logged or returned. The staging SSO gate remains unchanged, and the route has not been deployed or tested against hosted staging.

This improves an authenticated manual health check and gives a future authorized monitor a stable signal. It does not provide alerting, failed-deploy notifications, or longer log retention. Those remain P0-08 blockers; do not add an external notification provider without explicit authorization.

## Repository release controls follow-up (2026-11-01)

The repository API confirms the project is private. Reading `main` branch protection through the connected GitHub integration returns 403 (`Resource not accessible by integration`), so this check cannot establish whether a branch rule currently exists. Reading repository rulesets returns GitHub's 403 message that rulesets require GitHub Pro or a public repository. The earlier Issue #3 audit reported no enforceable main protection. Keep `release_controls` pending until an account owner verifies the repository settings and an authorized protection mechanism is in place; do not make the repository public or change plans automatically.

## P0-07 restore drill follow-up (2026-11-01)

A new branch `p007-nonpromoting-drill-2026-11-01` (`br-empty-pond-aoikialy`) was restored from the staging snapshot with `finalize: false`. Provider state confirms it is ready, `primary=false`, and `default=false`; the original staging branch remains `primary=true` and `default=true`. Using the restricted `cd_staging_app` role, the restored database returned the expected staging fingerprint and the same four vehicles/four image records as the source branch. This is a verified database snapshot restore without promoting or modifying the live staging data. The snapshot point was `2026-11-01 03:24:49 UTC`; it was about 11 hours 52 minutes old at the 15:16 UTC verification. No automatic snapshot schedule is configured.

The restore exposed an important coverage gap: the restored branch has no object-storage buckets, although database image rows exist. The database snapshot therefore does not by itself recover the vehicle media or private seller documents. End-to-end application recovery, private-object strategy, timed RTO measurement, and an approved retention schedule remain incomplete, so the combined P0-07 restore/backup gates stay pending/blocked. Neon automatically provisioned a 0.25-CU compute for the drill branch; it was suspended after database verification, and provider state confirms it is idle.

P0-06 outstanding work is in Issue #3. P0-07 remediation is in Issues #5 and #6. The latest P0-07 PR #4 commit is `50b77eea599bc52a5e8de82c05faf4eb6d71b46d` (CI passed), but its changes must not be treated as deployed or merged.

## Decision rule

- **P0-08 READY FOR DEVELOPMENT:** Yes. P1 design, schema review, contract tests and protected feature branches can proceed in parallel.
- **P0-08 ACCEPTED FOR RELEASE:** No. Do not authorize commercial clients, live messaging, payments, real customer data, public demo access, or broad rollout.
- **Safety:** Do not bypass P0-06/P0-07 by editing labels. No auto-promotion, Neon restore, destructive cleanup, branch force-push or secret exposure is allowed.

After all gates pass, reconfirm provider state, run `--verify` on the exact release commit, obtain explicit authorized sign-off and archive a dated evidence report.

## Safe error logging follow-up (2026-11-01)

Commit `58d388ce3d508272f4a18a2d6a9d5fbcbe026bb4` adds `lib/observability/safe-log.ts` and migrates application/API/authentication/operations error paths away from logging raw exception objects. The logger records an allowlisted error class and only explicitly selected context; tests verify database URLs, passwords and tokens in exception messages are omitted. The homepage database-failure path was included in the final scan. Local checks passed: `npm run typecheck`, `npm run lint`, and `npx vitest run --exclude 'tests/integration/**' --maxWorkers=1 --no-file-parallelism` (64 tests, 13 files); `git diff --check` was clean. GitHub Actions run [41321270163](https://github.com/vaishnavsawant1994-stack/Car-Dealership/actions/runs/41321270163) passed on that exact commit. This code remains unmerged and undeployed pending PR review and release gates.

A fresh Vercel runtime-error query for the last seven days returned one warning group: the PostgreSQL SSL compatibility warning appeared 47 times, affecting 13 users across nine routes, from 2026-10-31T19:29:21Z through 2026-11-01T05:39:44Z on deployment `dpl_54wihTyF6m4eu6P1YzLqPysY1Wpk`. The deployed lockfile pins `pg-connection-string` 2.14.0. Its warning states that `prefer`, `require`, and `verify-ca` currently behave as `verify-full`, but the next major version will apply weaker libpq semantics. For remote application databases, the app now explicitly sets `sslmode=verify-full` before passing `DATABASE_URL` to Prisma's PostgreSQL adapter; local loopback development/CI Postgres retains its existing settings because its isolated service has no TLS listener. Six focused unit tests cover both cases and ambiguous/weak remote modes. This code is still under review and is not deployed; verify the warning disappears only after an approved staging deployment and fresh runtime query. This change does not create an alert destination or establish successful alert delivery.
