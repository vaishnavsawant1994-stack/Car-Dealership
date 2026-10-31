# P0-03 — Repository Safety and Neutral Demo Identity

Implementation in the **Car-Dealership** repository only. The original repository and its production infrastructure remain read-only.

## Completed in code
- Renamed npm project to `car-dealership` and aligned its lockfile name.
- Removed `prisma migrate deploy` from `vercel-build` to prevent automatic DB mutations by the build pipeline.
- Added `lib/config/isolation.ts` to validate runtime, script and Prisma migration DB targets; requires explicit APP_ENV for production, rejects original-looking database targets and blocks commercial connection mode.
- Added `scripts/verify-isolation.ts` and an `isolation:check` npm script; `build` and `vercel-build` now invoke the preflight before running Next.js.
- Hosted build preflight requires a unique HTTPS site origin, matching auth origin, exact approved DB target and environment-specific S3 settings. These requirements intentionally block premature deployment until P0-04 resources exist.
- Renamed local Docker Compose project, container, volume and DB defaults uniquely; preserved temporary historical CI fixture name strictly in isolated GitHub Actions tests.
- Restricted the development seed to local/test environments and reset to the new local `car_dealership_dev` database.
- Replaced active branding, default contact details, social links, original showroom address, logo and sample home copy with a neutral Car Dealership Demo identity. Historical static assets/files remain present as references, not designated approved for external use.
- Disabled WhatsApp external deep links in Phase 0, routed customer contact to internal `/contact`.
- Made email delivery capture-only regardless of inherited Resend credentials; removed original fallback lead recipient and PII/token logging.
- Prevented seeded business contact data from overriding demo public config through the public site-config API.
- Disabled search indexing for noncommercial environments via headers/metadata/robots and suppressed sitemap for demos.
- Replaced legal pages with explicit demonstration notices.
- Added source isolation/communication behavior unit tests.

## Intentionally not yet completed
- GitHub **Private** visibility and protected main/rulesets: require GitHub repository administration. Check via UI before storing any business secrets or exposing the demo.
- New staging/demo PostgreSQL projects, database fingerprint bootstrap, separate database roles and migrations: **P0-04**. Current hostname/name checks are preflight, not proof of backend IAM isolation.
- New private/public media storage and credential-scope verification: **P0-04**.
- Authentication secret provisioning and real email sandbox: **P0-05**. No real mail currently sends.
- Independent Vercel project, preview/staging/demo environment variables, deployment protection and demo domain: **P0-06**.
- Backup/restore drill, e2e deployment validation, security/regulatory approval: **P0-07/P0-08**.
- Replace remaining historical filenames and synthetic test users with P0-04 demo fixtures; avoid breaking regression tests by changing stable test identities prematurely.
- Assess rights to any remaining original business-specific media before client demonstrations.

## Deployment blockers
Never deploy this project with the original Optimum `DATABASE_URL`, `DIRECT_URL`, `RESEND_API_KEY`, OAuth credentials, storage keys or Vercel project ID.

**P0-03 is a code-safety milestone, not production readiness.** In addition to the automated checks, deployment-boundary denial tests and independent service resources must be verified in subsequent milestones.
