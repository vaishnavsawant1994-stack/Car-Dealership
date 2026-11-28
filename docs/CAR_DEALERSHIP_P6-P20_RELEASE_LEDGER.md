# Car Dealership P6–P20 release ledger

**As of 2026-11-28.** This ledger records code and validation evidence for the current development sequence. Every PR below is still a draft and unmerged; CI success is engineering evidence, not release acceptance.

## Dependency-ordered development slices

| Phase | Work | PR | Evidence / state |
|---|---|---:|---|
| P6 | Phase integration, role matrix and showroom isolation foundations | [#38](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/38) | Draft; CI #167 passed. P1-05 source HEAD `223220110243bb7415dc22d5bd1634cdead5b7e0` is an ancestor of PR #38 HEAD `253a32b2e295663b8f18f1ed1a41335a99686405`. A broader query and derived-child scope audit remains open; P21 tracks additional inspection and sales-quote fixes. |
| P7 | Sales deal lifecycle and audited transitions | [#39](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/39) | Draft; P21 inspection and quote showroom fixes are carried into this branch. Integrated head `c0197ac`; exact-head CI #295 passed lint, type-check, isolated PostgreSQL tests, and production build. |
| P8 | Internal finance worksheet and invoice draft | [#40](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/40) | Draft; P21 inspection and quote showroom fixes are carried into this branch. Integrated head `a650566`; exact-head CI #296 passed. |
| P9 | Deterministic payment sandbox simulation | [#41](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/41) | Draft; P21 inspection and quote showroom fixes are carried into this branch. Integrated head `3d72660`; exact-head CI #297 passed. No payment processor or capture. |
| P10 | Delivery checklist, handover and vehicle transfer | [#42](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/42) | Draft; P21 inspection and quote showroom fixes are carried into this branch. Integrated head `b91703e`; exact-head CI #298 passed. |
| P11 | Showroom-scoped workshop service and checklists | [#43](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/43) | Draft; P21 inspection and quote showroom fixes are carried into this branch. Integrated head `93c30e0`; exact-head CI #299 passed. |
| P12 | Parts catalog, stock ledger and workshop issue flow | [#44](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/44) | Draft; P21 inspection and quote showroom fixes are carried into this branch. Integrated head `d9b66c5`; exact-head CI #300 passed. |
| P13 | Internal after-sales tasks | [#45](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/45) | Draft; P21 inspection and quote showroom fixes are carried into this branch. Integrated head `297b2fc`; exact-head CI #301 passed. |
| P14 | Read-only verified customer purchase portal | [#46](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/46) | Draft; P21 inspection and quote showroom fixes are carried into this branch. Integrated head `880db71`; exact-head CI #302 passed. |
| P15 | Audited notification consent and withdrawal controls | [#47](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/47) | Draft; P21 inspection and quote showroom fixes are carried into this branch. Integrated head `0d21451`; exact-head CI #303 passed. |
| P16 | Marketing signup/campaign delivery hard-disabled | [#48](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/48) | Draft; P21 inspection and quote showroom fixes are carried into this branch. Integrated head `ec040c2`; exact-head CI #304 passed. |
| P17 | Showroom-scoped activity counts, excluding PII and financial values | [#49](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/49) | Draft; P21 inspection and quote showroom fixes are carried into this branch. Integrated head `ca65885`; exact-head CI #305 passed. |
| P18 | S3 original and variant object cleanup, retryable deletion after storage failure | [#50](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/50) | Draft; P21 inspection and quote showroom fixes are carried into this branch. Integrated head `69084c5`; exact-head CI #306 passed, including isolated retry coverage. No live bucket was used. |
| P19 | Playwright browser suite on the production build and disposable database | [#51](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/51) | Draft; P21 inspection and quote showroom fixes are carried into this branch. Integrated head `ed88c3c` failed exact-head CI #307 at browser acceptance (54/55 passed); the failure was a duplicated customer update in the timeline and notification. P19 locator fix head `4132b7c`; exact-head CI #310 passed lint, type-check, isolated PostgreSQL tests, production build, Chromium install, and browser acceptance. |
| P20 | Release evidence and unresolved gate ledger | [#52](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/52) | Draft; P21 inspection and quote showroom fixes are carried into this branch. Application head `93f3dec` passed exact-head CI #308. P20 carries the P19 browser-locator fix. Its latest branch revision and exact-head CI evidence are tracked in PR #52; the prior integrated application head `93f3dec` passed CI #308. Earlier head #239 passed 300 tests across 73 files, production build, and 55 browser tests; those results are historical evidence only. |

## P21 source and integrated changes

- P21 active-showroom scoping for inspection and sales quote workflows remains tracked in draft [PR #53](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/53), stacked on PR #38. Its source head `98df79a` passed exact-head CI #243. Its inspection and derived quote predicates and PostgreSQL regressions are now merged as a parent into each downstream P7–P20 PR branch; refreshed exact-head CI #295–#306 passed for P7–P18. P19 integrated run #307 exposed one browser locator ambiguity (54/55 browser tests passed); P19 fix head `4132b7c` passed exact-head CI #310. P20 application head `93f3dec` passed CI #308; refreshed P20 head `ed60bbc` is in CI #312. No hosted migration or deployment was performed.

## Data and deployment boundaries

- Migrations are exercised only by CI against a fresh loopback PostgreSQL 16 container named `car_dealership_test`.
- No migration was applied to Neon, production, or existing staging. The existing Neon staging project’s default `staging` branch was rechecked on 2026-11-28: it is ready but unprotected, so it is not an isolated preview database and was not used. No production deployment or staging deployment was performed.
- Vercel SSO is enabled for all deployment types on both existing staging and demo projects. The staging project's latest recorded deployment still points to the older `main` commit `50263ecdaf7809b0d8ddb4406a48128fadd4d40d`; no new preview or deployment was created.
- No isolated Vercel preview was created: the Vercel GitHub namespaces check returned no connected namespaces, so repository Git integration is unavailable. No preview project or deployment was created; existing protected projects were left unchanged.
- No live payment processing, customer messaging, or campaign delivery was enabled.
- The F: main, P1 Preview, and P1-05 checkouts were read-only inspected in the prior audit; no local/F: checkout was modified during this continuation. The separate local P20 worktree has existing dirty P21/P1-05 inspection changes and was left untouched. P1 Preview is 17 commits ahead of `origin/main` and does not contain P1-05. P1-05 source commit `223220110243bb7415dc22d5bd1634cdead5b7e0` remains included in PR #38; local commit `719a111` changes only the P1-05 progress document.

## Unresolved release gates

- The repository is public by owner choice for now. Private-source release readiness and historical credential exposure response remain open; no deployment should occur while this gate is unmet.
- P1-05 source ancestry into PR #38 is verified. The F: state is now verified; follow-up inspection and quote-access fixes are on PR #53, while the broader showroom/assignment audit remains open.
- P0-06 issue #3 now has a concise non-sensitive acceptance checklist. Staging administrator recovery still requires the owner to enter credentials privately through a masked prompt.
- The Neon staging branch is unprotected and must not be treated as the isolated preview DB. Confirm a separate isolated database before any hosted migration; none has been run.
- P0-06 image upload and storage need an isolated provider test account, IAM/CDN checks, scanning/retention review, and backup evidence. The code-level S3 cleanup fix does not prove provider behavior.
- P0-07 backup/restore and P0-08 monitoring/rollback need operationally approved preview/staging evidence.
- Protected browser, responsive visual, and role acceptance must run on protected staging after the above gates and approved isolated preview configuration.
- Explicit release approval is required before migration, deployment, or a public demo.

These are genuine blockers to production readiness. Do not bypass them to make the ledger appear complete.
