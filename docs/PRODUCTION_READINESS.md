# Production readiness

**State: engineering review candidate; not approved for staging migration, production release, or public client demo.** Development work is in dependency-ordered open pull requests, none merged. Production and existing protected staging were not modified.

## Implemented product capabilities

- Public inventory and vehicle experience, responsive customer and staff applications, authentication, admin operations, and the existing showroom/role policy foundations.
- Sales deal lifecycle, finance worksheet/invoice draft, deterministic payment sandbox simulation, delivery and transfer, workshop, parts stock ledger, and after-sales tasks.
- Read-only verified customer purchase portal and audited channel-specific notification consent settings.
- Public newsletter signup and campaign sending remain disabled; campaign activation is blocked in code and staff controls cannot subscribe a record.
- Showroom-scoped operational counts for recent sales and current delivery, workshop, and after-sales queues.
- S3 vehicle image adapter now removes original and variant objects on cleanup and attempts cleanup after partial writes. Provider integration is not yet proven.
- CI validates migrations and tests on disposable PostgreSQL; P19 exact-head CI #394 passed all 55 browser tests. A separate temporary Neon preview child branch accepted all 22 migration SQL files (60 tables, 32 enums, 100 foreign keys), but the Prisma migration engine and migration history were not exercised.

## Release gates

- [ ] Reconcile the preserved F: checkout and P1-05 local work with PR #38; complete the broader resource and derived-record isolation review. P21 PR #53 covers inspections and linked quotes; P22 PR #55 covers private sell-request attachment reads.
- [ ] Keep repository public at the owner's direction; complete the historical credential exposure scan and respond to any confirmed exposure.
- [ ] Establish secure staging Super Admin recovery through private masked password entry.
- [ ] Validate P0-06 authentication and real vehicle image upload/storage/variants/cleanup against an isolated S3-compatible test account with approved credentials.
- [ ] Complete protected staging browser acceptance at desktop and mobile breakpoints while preserving Vercel SSO.
- [ ] Point the protected preview runtime at a schema-initialized branch after Prisma migration-engine validation; complete backup/restore, monitoring and tested rollback (P0-07/P0-08). S3 access/secret keys are still missing, so the build preflight remains blocked.
- [ ] Obtain explicit release acceptance before staging migration, deployment, or client-facing demo.

Live payment capture, external messaging, newsletter delivery, and production migrations are intentionally unavailable in the development slices. They require separate operational and security acceptance.

See [CAR_DEALERSHIP_P6-P20_RELEASE_LEDGER.md](CAR_DEALERSHIP_P6-P20_RELEASE_LEDGER.md) for the ordered PRs, CI evidence, and phase status.
