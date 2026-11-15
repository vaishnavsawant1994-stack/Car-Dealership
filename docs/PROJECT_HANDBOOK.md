# Car Dealership — Independent Demonstration — Project Handbook

> **Repository:** [vaishnavsawant1994-stack/Car-Dealership](https://github.com/vaishnavsawant1994-stack/Car-Dealership)  
> **Documentation review:** 15 November 2026 · **Scope:** checked-in source and existing documentation, not a fresh end-to-end certification.

## 1. Purpose and intended audience

**Goal:** Independent demo/development repository for vehicle marketplace and dealership workflow experiments, explicitly separate from the Optimum Automobiles production-brand project.

**Who this serves:** Developers and evaluators of a synthetic-data automotive sales platform.

## 2. Product features and expected journeys

1. Model vehicle listings, enquiries, test drives and customer interactions.
2. Exercise synthetic-data database and auth journeys.
3. Capture rather than send outbound demo email where configured.
4. Verify environment isolation before builds and migrations.

These are described product areas or repository-supported development paths. See the status and limitations below before claiming live feature completeness.

## 3. Technical architecture and project structure

Next.js/TypeScript; Prisma/PostgreSQL, Auth.js, file storage adapters, Vitest and Playwright. Root `app/`, `src/`, `components/`, `prisma/`, `scripts/`, `tests/`, `docs/`. Manifest includes `isolation:check`, `db:identity:check`, `db:health` and E2E commands.

## 4. Implementation maturity and evidence

Significant source and isolation tooling are present. This is a development/demo project, not a real dealership or a claim that every commercial workflow works end to end.

**Evidence level:** Repository source, current README and available manifest/structure were inspected. No new unit-test run, database migration, browser acceptance, security penetration test, CI re-run or live deployment is implied by this document. Treat older gate reports as date- and commit-specific records.

## 5. Installation, development and validation

`npm install`, configure an isolated DB and synthetic identities, `npm run isolation:check`, `npm run typecheck`, `npm test`, `npm run test:e2e`. Avoid `db:reset:dev`, seed and migration scripts without verifying the target database.

Recheck exact commands, package versions and environment variables against the current source. Use disposable credentials and isolated local/test data; never run destructive migrations or seed scripts against an unknown database.

## 6. Security, data and operational boundaries

- Never connect to Optimum Automobiles real customer/production data.
- Use synthetic user credentials and captured outbound messages.
- Preserve isolated database and environment identifiers.

For production use additionally verify access control, errors, secrets, backup/recovery, monitoring and relevant legal/privacy responsibilities.

## 7. Recommended next milestones

1. Review P0 safeguards and stage completion evidence.
2. Verify every demo flow with a seeded disposable DB.
3. Close auth, privacy and approval gaps before staging.
4. Maintain a strict separation from `Optimus-Automobiles`.

## 8. Source documents and change policy

- [`README.md`](../README.md)
- [`docs/`](../docs/)
- [`package.json`](../package.json)
- [`scripts/verify-isolation.ts`](../scripts/verify-isolation.ts)
- [`prisma/`](../prisma/)

This handbook supplements rather than replaces authoritative specs, security rules and exact-SHA qualification. Update it whenever the application architecture, deployment status, feature contract or project ownership changes.
