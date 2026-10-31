# Car-Dealership — Independent Demonstration & Development Project

**This is the independent Car-Dealership software project.** It is not the Optimum Automobiles production website or an operating dealership. Every environment must use new credentials and synthetic customer data.

- Source-code reference: `vaishnavsawant1994-stack/Optimus-Automobiles` (never modify for this project)
- This repository: `vaishnavsawant1994-stack/Car-Dealership`
- P0-03 safeguards: `docs/CAR_DEALERSHIP_P0-03.md`
- Default communication mode: email captured, WhatsApp actions route to the internal demo contact page
- Deployment: Not authorised until separate staging/demo services are provisioned and verified

**Important:** The historical documentation and test fixture account names below describe the original code foundation. Do not reuse original-business credentials, domains, or branding in any client-facing environment.

---

# Source foundation documentation (historical)

<!-- repository-profile:start -->
## Repository profile

**Purpose:** Premium pre-owned vehicle marketplace for inventory discovery, vehicle details, customer accounts, enquiries, test drives, favourites, and seller valuation requests.

**Core contents:** Next.js App Router, TypeScript, PostgreSQL, Prisma, Auth.js, validation/forms, private attachment handling, role-based administration, metadata/structured data, rate limiting, and unit/database/Playwright tests.

**Current status:** The README documents a substantial database-backed scope and repeatable verification commands. The current production deployment and exact-head gate were not re-certified by this documentation update.

**Brand decision required:** The repository is named `Optimus-Automobiles`; the README/application use “Optimum Automobiles”; the GitHub description also mentions “Deccan Wheels.” Choose the canonical public brand before changing URLs or repository names.

**Recommended next milestone:** Align branding, run the complete verification suite on the exact current head, validate private-document storage and production secrets, and record the deployment/release evidence.
<!-- repository-profile:end -->

Database-backed premium pre-owned luxury-car website built with Next.js App Router, TypeScript, PostgreSQL, Prisma, Auth.js, React Hook Form, Zod and Embla Carousel.

The Windows folder and npm package use the `Optimum Automobiles` name. All public UI, metadata, structured data and seed settings use **Optimum Automobiles**.

## Local setup

```powershell
npm install
docker compose up -d postgres
npx prisma migrate dev
npx prisma generate
npm run db:seed
npm run dev
```

The current development server is available at:

```text
http://localhost:3001
```

See `docs/DATABASE_SETUP.md` for database health, logs, reset and Prisma Studio commands. See `docs/CUSTOMER_ACCOUNT_MILESTONE.md` for authentication, email and demo-account setup.

## Verification

```powershell
npx prisma format
npx prisma validate
npx prisma generate
npx prisma migrate dev
npm run db:seed
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

## Implemented scope

- PostgreSQL-backed homepage inventory and brands
- Server-filtered, sorted and paginated inventory
- Real vehicle details, ordered gallery, specifications and grouped features
- Persisted enquiries and test-drive requests
- Sell-car valuation requests with private JPG/PNG/PDF attachments
- Verified customer registration, sign-in and password recovery
- Persistent favourites with automatic guest-to-account synchronization
- Protected customer dashboard, owned enquiries, test drives and sell requests
- Profile, notification and account-security controls
- Database-backed brand, body-type and search routes
- Canonical redirects, dynamic metadata and structured data
- Explicit service, information and legal pages with real 404, robots and sitemaps
- Role-based admin operations, content, settings, gallery and customer-document access
- Database-backed shared rate limiting and production security headers
- Deterministic 30-vehicle development seed
- Unit, database integration and Playwright tests

## Required production configuration

Set a strong `AUTH_SECRET`, database URLs, the canonical `NEXT_PUBLIC_SITE_URL`, real showroom phone variables, email delivery credentials and S3-compatible storage values before deployment. `PRIVATE_STORAGE_DRIVER=s3` keeps customer valuation documents private; they must not be served through the public CDN configured by `S3_PUBLIC_BASE_URL`.

Run `npx prisma migrate deploy` before starting a new release. The latest migration adds shared rate-limit buckets and private sell-request attachment metadata.
