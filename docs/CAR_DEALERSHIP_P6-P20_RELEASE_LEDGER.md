# Car Dealership P6–P20 release ledger

**As of 2026-11-27.** This ledger records code and validation evidence for the current development sequence. Every PR below is still a draft and unmerged; CI success is engineering evidence, not release acceptance.

## Dependency-ordered development slices

| Phase | Work | PR | Evidence / state |
|---|---|---:|---|
| P6 | Phase integration, role matrix and showroom isolation foundations | [#38](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/38) | Draft; CI run #167 passed. The preserved F: P1-05 checkout still needs an explicit reconciliation and broader scope audit. |
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
| P19 | Playwright browser suite on the production build and disposable database | [#51](https://github.com/vaishnavsawant1994-stack/Car-Dealership/pull/51) | Draft; CI #192 pending, including new browser step. |
| P20 | Release evidence and unresolved gate ledger | This PR | Documentation only; dependent on P19 result and independent acceptance. |

## Data and deployment boundaries

- Migrations are exercised only by CI against a fresh loopback PostgreSQL 16 container named `car_dealership_test`.
- No migration was applied to Neon, production, or existing staging. No production deployment or staging deployment was performed.
- Vercel staging SSO/protection remains in place.
- No live payment processing, customer messaging, or campaign delivery was enabled.
- The F: drive worktree and local databases were preserved; they were inspected read-only and were not overwritten.

## Unresolved release gates

- Repository privacy and historical credential exposure response must be completed before deployment.
- P1-05 local/F: work and the consolidated branch still need reconciliation, followed by the broader query and derived-child showroom/assignment audit.
- Independent security review and secure staging administrator recovery require an authorized independent reviewer and the owner to enter credentials privately through masked input.
- P0-06 image upload and storage need an isolated provider test account, IAM/CDN checks, scanning/retention review, and backup evidence. The code-level S3 cleanup fix does not prove provider behavior.
- P0-07 backup/restore and P0-08 monitoring/rollback need operationally approved preview/staging evidence.
- Protected browser, responsive visual, and role acceptance must run on protected staging after the above gates and approved isolated preview configuration.
- Explicit release approval is required before migration, deployment, or a public demo.

These are genuine blockers to production readiness. Do not bypass them to make the ledger appear complete.
