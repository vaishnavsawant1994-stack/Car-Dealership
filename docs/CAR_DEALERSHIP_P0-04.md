# P0-04 — Independent Database and Storage Infrastructure
Date: 2026-10-31
Scope: Car-Dealership ONLY. The original Optimum Automobiles repository, Vercel project and Neon database were not modified.

## Outcome
Provisioned **two independent Neon projects**, separated from the original production database account. Both have PostgreSQL 17 in Singapore (AWS ap-southeast-1), full committed Prisma schema and neutral fictional demo fixtures.

| | Staging | Demo |
|---|---|---|
| Neon project ID | `empty-dew-20186400` | `young-paper-44003842` |
| Neon branch ID | `br-snowy-union-aoz83v84` | `br-nameless-sea-a129d9oy` |
| Database name | `car_dealership_staging` | `car_dealership_demo` |
| Owner role | `cd_staging_owner` | `cd_demo_owner` |
| App permission role | `cd_staging_app` | `cd_demo_app` |
| App role LOGIN | **disabled** | **disabled** |
| Environment instance fingerprint | `e0a5faff-8c8a-4955-b70e-f5c1c17c38eb` | `37edbbfe-3ed1-4f34-9d75-a7a13ec05720` |
| Schema tables incl. Prisma history/identity | 42 | 42 |
| Recorded applied migrations | 7 | 7 |
| Fictional vehicles | 4 | 4 |
| Vehicle image references | 4 | 4 |
| Fictional user records | 2 | 2 |
| Fictional CRM enquiries | 2 | 2 |
| Fictional test drives | 1 | 1 |
| Fictional seller requests | 1 | 1 |
| Original business contact settings found | 0 | 0 |
| Public bucket | `car-dealership-staging-public` | `car-dealership-demo-public` |
| Private bucket | `car-dealership-staging-private` | `car-dealership-demo-private` |

Neon organisation used: `org-autumn-rain-30352620`, separate from the linked organisation holding `optimus-automobiles-db`. Never create a branch of or connect to that original database.

## Code changes (main branch)
- `prisma/migrations/20261031133000_car_dealership_environment/migration.sql` adds the environment-identity table and clears inherited original-business contact records.
- `prisma/schema.prisma` adds `CarDealershipEnvironment` matching the migration.
- `scripts/verify-database-identity.ts` checks APP_ENV, approved host, database name and expected instance UUID before privileged operations.
- `scripts/seed-hosted-demo.ts` performs an in-transaction fingerprint check before synthetic-only inserts. Run via `npm run db:seed:hosted-demo`.
- `prisma/demo-seed.sql` contains repeatable fictional vehicles, customer records and CRM examples; no usable passwords or real notification destinations.
- `lib/storage/sell-request-storage.ts` now uses an independent `S3_PRIVATE_BUCKET` rather than sharing public image storage.
- `scripts/verify-isolation.ts` requires exact public and private bucket names plus EXPECTED_DATABASE_ID in hosted environments.
- `.env.example` documents the additional variables; no credentials have been committed.
- Existing six migration files were preserved verbatim. Prisma migration-history records contain PostgreSQL SHA-256 checksums of each committed file.

## Security and runtime roles
Neon's role-creation API generated `cd_staging_runtime` and `cd_demo_runtime` with inherited `neon_superuser` membership. Neon refused to revoke or alter that membership under current account permissions. **Do not use these two managed roles for Car-Dealership runtime connections.** No app credentials were configured for them.

As a safer alternative, additional SQL roles `cd_staging_app` and `cd_demo_app` were created with:
- NOLOGIN, NOINHERIT, NOCREATEDB, NOCREATEROLE and zero role memberships;
- only read/write rights to application tables, SELECT-only access to `CarDealershipEnvironment`, no INSERT on `_prisma_migrations`, and no schema CREATE rights.
- Privilege matrix verified in both independent databases. These roles cannot yet be used for actual connections; P0-06 must enable LOGIN only while securely setting per-environment credentials and rechecking privileges. Managed roles should be reviewed for deletion after explicit provider/account authorisation.

### Required safety preflight for migrations/seeding
1. Explicitly verify target Neon **project ID**, branch ID, hostname, database name and resource ownership.
2. Verify the identity row matches `application='car-dealership'`, correct `environment`, and exact EXPECTED_DATABASE_ID above.
3. Refuse schema migration or seed when identity mismatches.
4. Migrate with the dedicated **owner/migration** role in a controlled job. Never use the restricted runtime role.
5. Review the migration SQL and take a backup/snapshot before any subsequent migration.
6. Run `npm run db:identity:check` before hosted seeding and release operations. Never copy credentials into GitHub source.

## Validation evidence
- Before migrations, both databases were independently verified to contain zero application tables.
- All six copied migrations and the new seventh migration were applied **only** to the newly created databases. Each migration was executed in an atomic SQL transaction, with a corresponding Prisma history entry.
- Both environments returned 42 tables and seven finished migration records.
- Both returned 4 fictional vehicles, 4 image references, 2 fictional customers, 2 enquiries, 1 sample drive and 1 seller request.
- Site settings had zero entries matching source-business contact names, phone or email.
- Four newly created Neon storage buckets were listed back with access levels `public_read` and `private`.
- Restrictive application-role privileges were verified with PostgreSQL permission queries.
- GitHub Actions CI on `efb718f1b75a2b9cabcfe3980acc9e497d3e6dba` passed: https://github.com/vaishnavsawant1994-stack/Car-Dealership/actions/runs/41205212332
- Original production repository `Optimus-Automobiles` main SHA remained `b77b866228d4cf18d0d451214132bb9c89e08d9b`.

## Remaining / not claimed
- GitHub target repository is still **PUBLIC** and `main` remains without branch protection. Do not store secrets or real customer data there.
- Local Docker Compose is configured, but the user's workstation database has **not** been started or tested from this chat.
- Both secure application roles are currently **NOLOGIN**; no service passwords or Vercel environment variables have been provisioned.
- S3-compatible buckets exist, but upload/download tests using application credentials are pending P0-06. Storage integration is not yet proven end to end.
- Existing vehicle photo files are used only for internal QA. Source asset licensing and branding must be approved before any external client demo.
- No independent Vercel site/domain has been deployed; do not infer any visible running website from the new databases.
- Credential rotation, backup/restore drills, negative cross-project access tests at the deployed-app level, observability, and commercial-production controls remain pending.
- The database-identity check is available for migrations and seeds. End-to-end enforcement at every runtime connection is a follow-on security gate before full deployment.
- No real customer, salesperson or staff login passwords were seeded. P0-05 covers auth and communication sandbox provisioning.

## Next phases
**P0-05:** Provision independent auth secrets, safe email outbox and optional restricted demo accounts. 
**P0-06:** New protected Vercel staging/demo project(s), application-role credentials, env-scoped storage credentials, real HTTPS domains, deployment wiring and end-to-end uploads.
**P0-07:** Isolation fault injection, full E2E tests and restore drills.
**P0-08:** Phase-0 signoff, after all administrative security blockers are addressed.

P0-04 is **infrastructure-provisioning complete**, but **independent deployed application functionality is not yet demonstrated**.
