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
- P0-07: append-only audit privileges, scheduled backups and RPO/RTO/retention, safe non-promoting recovery drill, verified private-object isolation and true credential-denial tests.
- P0-08: approved release controls on the private repo, exact-head review of security changes and explicit recorded final acceptance.

## Monitoring follow-up (2026-11-01)

The staging project is on Vercel Hobby, with SSO protection required for every deployment. Vercel's runtime-log API reports a one-hour retention window; a recent 30-minute error/fatal count query returned no records, which does not prove alert delivery or full-period health. Observability Plus is not enabled on this team, so its configuration endpoint is unavailable. No external alert destination was added.

The app previously had a database health helper but no HTTP health route. This PR now adds an uncached Node.js `GET /api/health` endpoint that returns HTTP 200 only when a `SELECT 1` check succeeds, otherwise 503. The response includes a timestamp, latency, and a boolean status only; database driver messages are not logged or returned. The staging SSO gate remains unchanged, and the route has not been deployed or tested against hosted staging.

This improves an authenticated manual health check and gives a future authorized monitor a stable signal. It does not provide alerting, failed-deploy notifications, or longer log retention. Those remain P0-08 blockers; do not add an external notification provider without explicit authorization.

P0-06 outstanding work is in Issue #3. P0-07 remediation is in Issues #5 and #6. The latest P0-07 PR #4 commit is `50b77eea599bc52a5e8de82c05faf4eb6d71b46d` (CI passed), but its changes must not be treated as deployed or merged.

## Decision rule

- **P0-08 READY FOR DEVELOPMENT:** Yes. P1 design, schema review, contract tests and protected feature branches can proceed in parallel.
- **P0-08 ACCEPTED FOR RELEASE:** No. Do not authorize commercial clients, live messaging, payments, real customer data, public demo access, or broad rollout.
- **Safety:** Do not bypass P0-06/P0-07 by editing labels. No auto-promotion, Neon restore, destructive cleanup, branch force-push or secret exposure is allowed.

After all gates pass, reconfirm provider state, run `--verify` on the exact release commit, obtain explicit authorized sign-off and archive a dated evidence report.
