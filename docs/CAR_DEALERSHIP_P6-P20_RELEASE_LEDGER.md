# Car Dealership P6–P20 release ledger

**As of 2026-11-28.** This ledger records code and validation evidence for the current development sequence. Every PR below is still a draft and unmerged; CI success is engineering evidence, not release acceptance.

## Dependency-ordered development slices

| Phase | Work | PR | Evidence / state |
|---|---|---:|---|
| P6 | Phase integration, role matrix and showroom isolation foundations | [#38](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/38) | Draft; CI #167 passed. P1-05 HEAD `223220110243bb7415dc22d5bd1634cdead5b7e0` is an ancestor of PR #38 HEAD `253a32b2e295663b8f18f1ed1a41335a99686405`. Current F: working-tree edits cannot be inspected in this session; broader query and derived-child scope audit remains open. |
| P7 | Sales deal lifecycle and audited transitions | [#39](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/39) | Draft; CI #171 passed. |
| P8 | Internal finance worksheet and invoice draft | [#40](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/40) | Draft; CI #173 passed. |
| P9 | Deterministic payment sandbox simulation | [#41](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/41) | Draft; CI #176 passed. No payment processor or capture. |
| P10 | Delivery checklist, handover and vehicle transfer | [#42](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/42) | Draft; CI #179 passed. |
| P11 | Showroom-scoped workshop service and checklists | [#43](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/43) | Draft; CI #185 passed. |
| P12 | Parts catalog, stock ledger and workshop issue flow | [#44](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/44) | Draft; CI #182 passed. |
| P13 | Internal after-sales tasks | [#45](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/45) | Draft; CI #185 passed. |
| P14 | Read-only verified customer purchase portal | [#46](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/46) | Draft; CI #186 passed. |
| P15 | Audited notification consent and withdrawal controls | [#47](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/47) | Draft; CI #187 passed. |
| P16 | Marketing signup/campaign delivery hard-disabled | [#48](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/48) | Draft; CI #189 passed after correcting a narrowed newsletter status check. |
| P17 | Showroom-scoped activity counts, excluding PII and financial values | [#49](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/49) | Draft; CI #190 passed (lint, type-check, isolated PostgreSQL tests, production build). |
| P18 | S3 original and variant object cleanup, with partial-write cleanup | [#50](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/50) | Draft; CI #191 passed (lint, type-check, tests, production build). No real bucket was used. |
| P19 | Playwright browser suite on the production build and disposable database | [#51](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/51) | Draft; CI #202 passed: lint, type-check, isolated PostgreSQL tests, production build, Chromium install, and all 55 browser tests. |
| P20 | Release evidence and unresolved gate ledger | [#52](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/52) | Draft; P20 CI #204 and ledger-update CI #205 passed, including all 55 browser tests. Documentation only; owner acceptance remains outstanding. |

## Follow-up hardening beyond P20

- P21 active-showroom scoping for inspection and sales quote workflows is tracked in draft [PR #53](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/53), stacked on PR #38. Exact-head CI #227 passed lint, type-check, isolated PostgreSQL-backed tests, and production build. The public PR summary is intentionally concise. No hosted migration or deployment was performed.

## Data and deployment boundaries

- Migrations are exercised only by CI against a fresh loopback PostgreSQL 16 container named `car_dealership_test`.
- No migration was applied to Neon, production, or existing staging. No production deployment or staging deployment was performed.
- Vercel staging SSO/protection remains in place.
- No live payment processing, customer messaging, or campaign delivery was enabled.
- The F: drive worktree and local databases were not modified. The current F: working-tree status is unverified because access was denied in this session.

## Unresolved release gates

- The repository is public by owner choice for now. Private-source release readiness and historical credential exposure response remain open; no deployment should occur while this gate is unmet.
- P1-05 commit ancestry into PR #38 is verified. The F: checkout's current edits remain unverified, and the broader query and derived-child showroom/assignment audit remains open.
- Secure staging administrator recovery requires the owner to enter credentials privately through masked input.
- P0-06 image upload and storage need an isolated provider test account, IAM/CDN checks, scanning/retention review, and backup evidence. The code-level S3 cleanup fix does not prove provider behavior.
- P0-07 backup/restore and P0-08 monitoring/rollback need operationally approved preview/staging evidence.
- Protected browser, responsive visual, and role acceptance must run on protected staging after the above gates and approved isolated preview configuration.
- Explicit release approval is required before migration, deployment, or a public demo.

These are genuine blockers to production readiness. Do not bypass them to make the ledger appear complete.
