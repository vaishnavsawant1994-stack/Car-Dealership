# Car Dealership — Phase 1–5 integrated development candidate

Branch: integration/phase1-phase5-development

This is an integration and QA candidate, not a live product release. The original protected Vercel staging deployment is unchanged.

## Included code

- Phase 1: canonical routes, organisation profile, showroom/staff associations, staff account lifecycle, effective role-permission matrix, settings, notifications, audit timeline, catalog validation and cross-module safety tests.
- Phase 2: procurement intake, acquisition inspection readiness and controlled conversion to unpublished vehicle inventory.
- Phase 3: private 43-point vehicle condition checklist, separate administrator review, final reports/history and private evidence.
- Phase 4: Customer 360, audited internal follow-ups, consent withdrawals and a non-destructive, manually verified data-rights request intake.
- Phase 5: assignment-scoped sales enquiry/test-drive opportunity overview and private indicative INR quote snapshots. No invoice/payment/sale/contract is created.
- CI includes isolated PostgreSQL migration tests, lint, TypeScript checking, unit/integration tests and an isolated Next.js production build.

## Not complete or accepted

- An independently validated P1-05 organization/showroom tenant isolation policy across *all* staff APIs and database queries; the owner's separate local Codex work must be reconciled.
- Full sales deal lifecycle, contract/quote approval, GST/RTO accounting, payments/settlements, buyer delivery, workshop, parts inventory, after-sales, omnichannel communications and marketing analytics.
- Customer verified self-service opt-in, secure data export or lawful erasure approvals, retention and private file antivirus scanning.
- Client-grade responsive browser/pixel QA on all required routes, live authenticated tests, reliable backup/restore and staged rollback.
- Final security gates: repository privacy, independent review and staging Super Admin password recovery requiring the owner to enter a new password securely.
- No real customer messaging, real payment processing, unprotected public demo or staging schema deployment is authorized by this branch.

## Integration order

The existing feature PRs remain open for granular review; this branch is the single current code integration candidate, superseding the earlier Phase 1–4 review branch for new feature inclusion. Review migration and permission policy changes before any merge to main or deployment.
