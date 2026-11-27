# Car Dealership P6–P20 release ledger

**As of 2026-11-28.** This ledger records code and validation evidence for the current development sequence. Every PR below is still a draft and unmerged; CI success is engineering evidence, not release acceptance.

## Dependency-ordered development slices

| Phase | Work | PR | Evidence / state |
|---|---|---:|---|
| P6 | Phase integration, role matrix and showroom isolation foundations | [#38](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/38) | Draft; CI #167 passed. P1-05 source HEAD `223220110243bb7415dc22d5bd1634cdead5b7e0` is an ancestor of PR #38 HEAD `253a32b2e295663b8f18f1ed1a41335a99686405`. A broader query and derived-child scope audit remains open; P21 tracks additional inspection and sales-quote fixes. |
| P7 | Sales deal lifecycle and audited transitions | [#39](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/39) | Draft; exact-head CI #246 passed lint, type-check, isolated PostgreSQL tests, and production build after linked vehicle showroom checks were added. |
| P8 | Internal finance worksheet and invoice draft | [#40](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/40) | Draft; exact-head CI #249 passed lint, type-check, isolated PostgreSQL tests, and production build with linked vehicle showroom scoping. |
| P9 | Deterministic payment sandbox simulation | [#41](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/41) | Draft; exact-head CI #250 passed lint, type-check, isolated PostgreSQL tests, and production build with scoped sandbox queries. No payment processor or capture. |
| P10 | Delivery checklist, handover and vehicle transfer | [#42](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/42) | Draft; exact-head CI #251 passed lint, type-check, isolated PostgreSQL tests, and production build with linked vehicle showroom checks. |
| P11 | Showroom-scoped workshop service and checklists | [#43](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/43) | Draft; exact-head CI #252 passed lint, type-check, isolated PostgreSQL tests, and production build with linked vehicle showroom scope. |
| P12 | Parts catalog, stock ledger and workshop issue flow | [#44](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/44) | Draft; exact-head CI #253 passed lint, type-check, isolated PostgreSQL tests, and production build with linked workshop vehicle scope. |
| P13 | Internal after-sales tasks | [#45](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/45) | Draft; exact-head CI #255 passed lint, type-check, isolated PostgreSQL tests, and production build with linked vehicle showroom scope. |
| P14 | Read-only verified customer purchase portal | [#46](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/46) | Draft; exact-head CI #186 passed with current P13 base. |
| P15 | Audited notification consent and withdrawal controls | [#47](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/47) | Draft; consent-history behavior is covered by exact-head CI #259, which passed lint, type-check, isolated PostgreSQL tests, and production build. |
| P16 | Marketing signup/campaign delivery hard-disabled | [#48](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/48) | Draft; CI #189 passed after correcting a narrowed newsletter status check, against current P15 base. |
| P17 | Showroom-scoped activity counts, excluding PII and financial values | [#49](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/49) | Draft; exact-head CI #257 passed lint, type-check, isolated PostgreSQL tests, and production build with linked showroom scoping. |
| P18 | S3 original and variant object cleanup, retryable deletion after storage failure | [#50](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/50) | Draft; exact-head CI #232 passed lint, type-check, 73 test files (300 tests), and production build. Includes isolated retry coverage; no live bucket was used. |
| P19 | Playwright browser suite on the production build and disposable database | [#51](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/51) | Draft; exact-head CI #258 passed lint, type-check, 73 test files (300 tests), production build, Chromium install, and all 55 browser tests with the latest P18 cleanup included. |
| P20 | Release evidence and unresolved gate ledger | [#52](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/52) | Draft; exact-head CI #239 passed lint, type-check, all 300 tests across 73 files, production build, and all 55 browser tests. Includes P18 retry-safe image cleanup. The ledger refresh at `db71131` passed exact-head CI #240; the status update at `357fa65` passed exact-head CI #241; release approval remains outstanding. |

## Follow-up hardening beyond P20

- P21 active-showroom scoping for inspection and sales quote workflows is tracked in draft [PR #53](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/53), stacked on PR #38. Prior exact-head CI #227 passed. Updated exact-head CI #243 passed lint, type-check, isolated PostgreSQL-backed tests, and production build, including a regression for an inquiry whose linked vehicle and existing quote belong to another showroom. No hosted migration or deployment was performed.

## Data and deployment boundaries

- Migrations are exercised only by CI against a fresh loopback PostgreSQL 16 container named `car_dealership_test`.
- No migration was applied to Neon, production, or existing staging. No production deployment or staging deployment was performed.
- Vercel staging SSO/protection remains in place.
- No isolated Vercel preview was created: GitHub repository linking requires a Vercel GitHub Login Connection that is not configured. No preview project or deployment was created; existing protected projects were left unchanged.
- No live payment processing, customer messaging, or campaign delivery was enabled.
- The F: main, P1 Preview, and P1-05 checkouts were read-only inspected and are clean. No local database or application code was changed. P1 Preview is 17 commits ahead of `origin/main` and does not contain P1-05. P1-05 source commit `223220110243bb7415dc22d5bd1634cdead5b7e0` remains included in PR #38; local commit `719a111` changes only the P1-05 progress document.

## Unresolved release gates

- The repository is public by owner choice for now. Private-source release readiness and historical credential exposure response remain open; no deployment should occur while this gate is unmet.
- P1-05 source ancestry into PR #38 is verified. The F: state is now verified; follow-up inspection and quote-access fixes are on PR #53, while the broader showroom/assignment audit remains open.
- P0-06 issue #3 now has a concise non-sensitive acceptance checklist. Staging administrator recovery still requires the owner to enter credentials privately through a masked prompt.
- P0-06 image upload and storage need an isolated provider test account, IAM/CDN checks, scanning/retention review, and backup evidence. The code-level S3 cleanup fix does not prove provider behavior.
- P0-07 backup/restore and P0-08 monitoring/rollback need operationally approved preview/staging evidence.
- Protected browser, responsive visual, and role acceptance must run on protected staging after the above gates and approved isolated preview configuration.
- Explicit release approval is required before migration, deployment, or a public demo.

These are genuine blockers to production readiness. Do not bypass them to make the ledger appear complete.
