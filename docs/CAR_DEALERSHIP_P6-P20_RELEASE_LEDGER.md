# Car Dealership P6–P20 release ledger

**As of 2026-11-28.** This ledger records code and validation evidence for the current development sequence. PRs #38–#55 are open, mergeable, and out of draft; none is merged. CI success is engineering evidence, not release acceptance.

## Dependency-ordered development slices

| Phase | Work | PR | Evidence / state |
|---|---|---:|---|
| P6 | Phase integration, role matrix and showroom isolation foundations | [#38](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/38) | Open, mergeable, ready for normal review; exact-head CI #398 passed. F: main and separate P1-05 worktrees are clean; broader child-record scope audit continues in #53 and #55. |
| P7 | Sales deal lifecycle and audited transitions | [#39](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/39) | Open, mergeable, ready for normal review; exact-head CI #315 passed. |
| P8 | Internal finance worksheet and invoice draft | [#40](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/40) | Open, mergeable, ready for normal review; exact-head CI #341 passed. |
| P9 | Deterministic payment sandbox simulation | [#41](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/41) | Open, mergeable, ready for normal review; exact-head CI #342 passed. No payment processor or capture. |
| P10 | Delivery checklist, handover and vehicle transfer | [#42](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/42) | Open, mergeable, ready for normal review; exact-head CI #369 passed. |
| P11 | Showroom-scoped workshop service and checklists | [#43](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/43) | Open, mergeable, ready for normal review; exact-head CI #380 passed. |
| P12 | Parts catalog, stock ledger and workshop issue flow | [#44](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/44) | Open, mergeable, ready for normal review; exact-head CI #381 passed. |
| P13 | Internal after-sales tasks | [#45](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/45) | Open, mergeable, ready for normal review; exact-head CI #382 passed. |
| P14 | Read-only verified customer purchase portal | [#46](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/46) | Open, mergeable, ready for normal review; exact-head CI #384 passed. |
| P15 | Audited notification consent and withdrawal controls | [#47](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/47) | Open, mergeable, ready for normal review; exact-head CI #386 passed. |
| P16 | Marketing signup/campaign delivery hard-disabled | [#48](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/48) | Open, mergeable, ready for normal review; exact-head CI #388 passed. Marketing delivery remains disabled. |
| P17 | Showroom-scoped activity counts, excluding PII and financial values | [#49](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/49) | Open, mergeable, ready for normal review; exact-head CI #390 passed. |
| P18 | S3 original and variant object cleanup, with partial-write cleanup | [#50](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/50) | Open, mergeable, ready for normal review; exact-head CI #406 passed, including local cleanup path-traversal regression tests. No real bucket was used. |
| P19 | Playwright browser suite on the production build and disposable database | [#51](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/51) | Open, mergeable, ready for normal review; exact-head CI #394 passed, including all 55 browser tests. |
| P20 | Release evidence and unresolved gate ledger | [#52](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/52) | Exact-head CI #407 passed; docs-only heads `0e0956a1a3f85b16f8de713ccabee2a3d7c19b36` and `85849702af866d693b1d64211efb38dff6a13499` passed CI #415 and #416, respectively, including all 55 browser tests. The current ledger update is documentation-only; release acceptance remains outstanding. |

## Data and deployment boundaries

- Migrations are exercised only by CI against a fresh loopback PostgreSQL 16 container named `car_dealership_test`.
- No migration was applied to Neon, production, or existing staging. No production deployment or staging deployment was performed.
- Vercel staging SSO/protection remains in place.
- No live payment processing, customer messaging, or campaign delivery was enabled.
- The F: drive worktree and local databases were preserved; they were inspected read-only and were not overwritten.
- P0-03 follow-up PR #54 removes the obsolete blanket commercial-database block while retaining explicit project, host, database-name, scheme, and legacy-target checks. Exact-head CI #408 passed; it remains open for normal review.
- The dedicated Vercel roadmap-preview project requires SSO for every deployment and has no deployment. Its environment variables are preview-only. The separate Neon preview project `car-dealership-preview-db` has one new default branch, `neondb`, with no tables and zero bytes written. A fresh 32-byte email-capture key is stored as a sensitive Vercel preview-only variable; it was generated for this isolated preview and was not displayed. No migration was run. Preview remains incomplete: it has no `DATABASE_URL` or restricted runtime login, so no build or deployment has been attempted. Existing staging/demo project settings, databases, and credentials were not changed.

## Unresolved release gates

- Repository remains public at the owner's direction. Before deployment, obtain a dedicated full-history credential scan and respond to any confirmed exposure. A pattern-only scan of the 433 commits reachable from 42 refs in the local P20 Git database found matches only in `.env.example`, CI, and database-isolation/health/logging/recovery tests (12 commits across 8 files). No dedicated scanner was installed, so this does not prove the entire GitHub history clean.
- P1-05 local/F: work and the consolidated branch still need reconciliation, followed by the broader query and derived-child showroom/assignment audit. P21 PR #53 covers inspection and linked quote paths; exact-head CI #411 passed on `9bd0f5a2eb0e2e4d855c20d1af3116e442af87c5`, including scope predicates on evidence reads and final writes. P22 PR #55 reapplies showroom and assignment scope to private sell-request attachment reads; exact-head CI #413 passed on `7811721a7fe3d3aa6273e98f88d40766e1b3f4c7`.
- Secure staging administrator recovery requires the owner to enter credentials privately through masked input.
- P0-06 image upload and storage need an isolated provider test account, IAM/CDN checks, scanning/retention review, and backup evidence. The code-level S3 cleanup fix does not prove provider behavior.
- P0-07 backup/restore and P0-08 monitoring/rollback need operationally approved preview/staging evidence.
- Protected browser, responsive visual, and role acceptance must run on protected staging after the above gates and approved isolated preview configuration.
- Explicit release approval is required before staging migration, production deployment, or a public demo.

These are genuine blockers to production readiness. Do not bypass them to make the ledger appear complete.

