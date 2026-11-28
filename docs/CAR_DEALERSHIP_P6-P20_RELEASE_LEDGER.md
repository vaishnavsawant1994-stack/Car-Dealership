# Car Dealership P6–P20 release ledger

**As of 2026-11-28.** All listed PRs remain open drafts and unmerged. Exact-head CI is engineering evidence, not release acceptance.

## Dependency-ordered development slices

| Phase | Work | PR | Evidence / state |
|---|---|---:|---|
| P6 | Phase integration, role matrix and showroom isolation foundations | [#38](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/38) | Draft; exact-head CI #167 passed. P1-05 source head 223220110243bb7415dc22d5bd1634cdead5b7e0 is an ancestor of this PR. Local P1-05/P21 edits in the C: P20 worktree are preserved and uncommitted; the F: checkout cannot currently produce a valid git status, so full checkout reconciliation remains open. |
| P7 | Sales deal lifecycle and audited transitions | [#39](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/39) | Draft; exact-head CI #315 passed. Deal reads and writes also constrain the linked inquiry showroom. |
| P8 | Internal finance worksheet and invoice draft | [#40](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/40) | Draft; exact-head CI #341 passed. Finance access constrains linked deal, inquiry, and vehicle showroom scope. |
| P9 | Deterministic payment sandbox simulation | [#41](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/41) | Draft; exact-head CI #342 passed. No payment processor or capture. |
| P10 | Delivery checklist, handover and vehicle transfer | [#42](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/42) | Draft; exact-head CI #369 passed with linked deal, inquiry, and vehicle showroom filters. |
| P11 | Showroom-scoped workshop service and checklists | [#43](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/43) | Draft; exact-head CI #380 passed. |
| P12 | Parts catalog, stock ledger and workshop issue flow | [#44](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/44) | Draft; exact-head CI #381 passed. |
| P13 | Internal after-sales tasks | [#45](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/45) | Draft; exact-head CI #382 passed with full delivery-to-deal-to-inquiry showroom scoping. |
| P14 | Read-only verified customer purchase portal | [#46](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/46) | Draft; exact-head CI #384 passed. |
| P15 | Audited notification consent and withdrawal controls | [#47](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/47) | Draft; exact-head CI #386 passed. |
| P16 | Marketing signup/campaign delivery hard-disabled | [#48](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/48) | Draft; exact-head CI #388 passed. Marketing remains disabled. |
| P17 | Showroom-scoped activity counts, excluding PII and financial values | [#49](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/49) | Draft; exact-head CI #390 passed. |
| P18 | S3 original and variant object cleanup, retryable deletion after storage failure | [#50](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/50) | Draft; exact-head CI #392 passed. No live bucket was used. |
| P19 | Playwright browser suite on the production build and disposable database | [#51](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/51) | Draft; exact-head CI #394 passed, including all 55 browser tests. |
| P20 | Release evidence and unresolved gate ledger | [#52](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/52) | Draft; exact-head CI #396 passed lint, type-check, isolated PostgreSQL tests, production build, Chromium install, and browser acceptance. It includes the delivery and after-sales linked-showroom regression. |

## Showroom scope audit update

A derived-record audit found that a deal and its vehicle could be in an actor's showroom while the linked inquiry belonged to another showroom. P7–P20 now enforce linked-inquiry scope for deal reads and mutations, finance, invoice and sandbox access, delivery eligibility and delivery-case reads, and after-sales tasks through their delivery/deal/inquiry chain. The isolated PostgreSQL regression builds deliberately mismatched synthetic records and verifies each of those paths denies access or action. Exact-head CI #396 passed. Workshop, parts, quote, and inspection paths also apply linked-resource showroom predicates; broader protected-staging acceptance remains outstanding.

P21 inspection and derived quote scope work remains tracked in draft [PR #53](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/53), stacked on PR #38; exact-head CI #243 passed. PRs #39–#52 are stacked in dependency order after the P21 branch.

## Data and deployment boundaries

- Migrations were exercised only by CI against a fresh loopback PostgreSQL 16 container named `car_dealership_test`.
- No migration was applied to Neon, production, or existing staging. Neon staging's default branch was observed unprotected and was not used.
- Vercel SSO remains enabled on existing staging and demo deployments. No deployment or alias change was made.
- No isolated Vercel preview was created because no GitHub namespace was connected to Vercel.
- No live payment processing, customer messaging, or campaign delivery was enabled.
- The F: checkout was not modified. Its current git status remains unreadable; no local edits or database files were overwritten. Existing dirty changes in the separate C: P20 worktree were left intact.
- The repository remains public at the user's direction.

## Remaining release work

- Complete F: checkout/worktree reconciliation without replacing local changes, then finish the broad showroom/assignment and derived-child access audit.
- Secure staging administrator recovery requires the owner to enter credentials privately through masked input.
- P0-06 image upload and storage still need an isolated provider test account, IAM/CDN checks, scanning/retention review, and backup evidence; code-level S3 cleanup does not prove provider behavior.
- P0-07 backup/restore and P0-08 monitoring/rollback need operationally approved preview/staging evidence.
- Protected browser, responsive visual, and role acceptance must run on protected staging after an isolated preview configuration is available.
- Review and remediate any real credential exposure found in repository history before deployment; repository privacy itself is not a release gate.
- Explicit release approval is still required before hosted migration, deployment, or a public demo.

These remaining items prevent a production-readiness claim. Do not bypass them.
