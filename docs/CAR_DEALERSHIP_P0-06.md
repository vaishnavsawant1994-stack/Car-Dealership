# Car-Dealership P0-06 — Protected Staging and Demo Deployments

**Status checked:** 2026-11-01  
**Scope:** Car-Dealership only. The Optimum Automobiles production project and database are out of scope.

## Current state

The platform resources are not wholly unprovisioned. A protected staging deployment is already running, while the separate demo project is provisioned but not connected to its application services.

| Resource | Staging | Demo |
|---|---|---|
| Vercel project | `car-dealership-staging` | `car-dealership-demo` |
| Vercel access protection | Vercel SSO enabled for all deployments | Vercel SSO enabled for all deployments |
| HTTPS Vercel domain | `car-dealership-staging.vercel.app` (verified) | `car-dealership-demo-nine.vercel.app` (verified) |
| Application deployment | READY on `main`, commit `50263ecdaf7809b0d8ddb4406a48128fadd4d40d` | No deployment |
| Neon project/database | `empty-dew-20186400` / `car_dealership_staging` | `young-paper-44003842` / `car_dealership_demo` |
| Neon branch | `br-snowy-union-aoz83v84` (`staging`) | `br-nameless-sea-a129d9oy` (`demo`) |
| Database environment fingerprint | `e0a5faff-8c8a-4955-b70e-f5c1c17c38eb` | `37edbbfe-3ed1-4f34-9d75-a7a13ec05720` |
| Public/private storage buckets | Present | Present |
| Application DB login | `cd_staging_webapp` uses password auth | `cd_demo_app` is still `NOLOGIN` |
| Vercel app configuration | Runtime DB, auth/capture, identity and storage variables are configured for the protected deployment | Only environment identity/demo marker variables are present; no DB, auth, or storage runtime configuration |

The GitHub repository is currently **private**. Some older P0-03/P0-05 notes still say it is public and that Vercel projects do not exist; those statements are stale. The project-specific default Vercel domains provide HTTPS. A separate custom domain has not been attached.

The Neon storage API reports the branch storage endpoints enabled in `ap-southeast-1` and requires path-style S3 requests. The bucket access levels are `public_read` for vehicle media and `private` for seller documents. Vercel's current staging environment contains isolated storage credentials. The demo project still needs its own credentials.

## P0-06 administrator recovery status

The latest read-only staging audit found the fictional administrator account active, email-verified, and assigned `SUPER_ADMIN`; it has a password hash but no recorded login, no sessions, and no valid reset tokens. The prior GitHub issue's note that the account was disabled is stale. The approved recovery implementation is on PR #12, which remains open and awaits independent peer review. Its local script now prompts for the password through a hidden interactive TTY and refuses an environment-variable password. The recovery has **not** been executed, so sign-in, logout/revocation, and authenticated vehicle-image acceptance remain outstanding.

The previously reported P0-06 probe object at `p006-acceptance/vehicle-image-probe.png` was not present in the staging public bucket during the latest exact-key check. Staging deployment SSO remains enabled. Vercel automation-bypass records could not be enumerated with the connected API, and the browser session was logged out, so their current status still needs confirmation in the Vercel dashboard.

## Remaining P0-06 work

1. Create or enable a demo-only login role with a unique credential and grant it only the existing restricted `cd_demo_app` permissions. Keep the owner and migration role out of the application runtime.
2. Pull the demo branch's Neon-managed object-storage credentials and configure the demo Vercel project with its own database URLs, auth secret, email-capture key, database identity, bucket names, S3 endpoint/region/path-style setting, and public origin. Do not reuse staging values or write secrets to Git.
3. Deploy the current reviewed `main` commit to the protected demo project. Keep both staging and demo behind Vercel authentication while this is a demonstration environment.
4. Verify protected access, environment identity, database-backed pages, private document upload/download, and captured-email behavior end to end. No email or other external communication may be enabled.
5. Independently review PR #12 and verify the actual GitHub branch protection and Vercel preview-environment secret scoping. The repository issue reports no enforceable branch protection; no dashboard/API confirmation was available in this check.

## Evidence boundaries

- Vercel reported the staging deployment as `READY` on the current repository head, and both Vercel projects have SSO protection configured for all deployments.
- Neon metadata confirmed the two independent databases, branches, application roles, and four correctly scoped storage buckets.
- Vercel environment listings were inspected without decrypting or printing secret values. Environment-variable presence does not prove that the credentials work.
- No hosted upload/download test, database login test, domain ownership check, or branch-protection check was run as part of this status update.

**P0-06 is in progress:** staging infrastructure and its deployment are in place; demo credential wiring and full end-to-end verification remain.
