# Car Dealership — Development Integration Status

## Current integration branch

Branch: integration/phase1-phase4-development

This branch consolidates the remotely available and independently tested Car Dealership development work. It is an **engineering integration candidate**, not the latest live protected Vercel deployment.

| Workstream | Included development slice | Verification remaining |
| --- | --- | --- |
| P1-01 to P1-04 | Foundation routes, business profile, showrooms/staff assignments, staff invitations/lifecycle | Cross-feature acceptance and review |
| P1-05 | Read-only, canonical effective role matrix and test coverage | Reconcile local Codex P1-05, implement negative tenant/branch isolation end-to-end |
| P1-06 to P1-10 | Settings, notifications, audit, reference catalog, integration contracts | Protected browser and release acceptance |
| P2-01 to P2-03 | Procurement intake, inspection readiness, auditable acquired-to-unpublished inventory draft | Physical/ownership verification and live E2E |
| P3-01 to P3-03 | 43-check condition inspection, separate review, reports, private evidence | File scanning/retention, storage IAM, live visual and browser E2E |
| P4-01 to P4-02 | Customer 360 read-only CRM and internal follow-ups | Confirm branch ownership, data rights and live authenticated E2E |
| Later product modules | Sales, accounting, workshop, parts, after-sales, marketing, analytics, SaaS and other roadmap items | Not implemented or accepted by this integration candidate |

### Required final release gates (deferred by owner, not waived)

- Repository privacy and historical credential exposure response.
- Secure staging administrator password recovery via private masked input.
- P0-06 authenticated user/login/logout and full vehicle image upload/storage/variants/cleanup acceptance.
- P0-07 validated backup/restore and P0-08 release monitoring/rollback.
- Versioned schema migration and branch/tenant isolation for the correct approved database.
- Protected Vercel preview and end-to-end UI/role/mobile/desktop acceptance without real customers, external messaging or payments.
- Separate client-facing demo release approval after staging acceptance.

### Deployment reality

The existing staging website https://car-dealership-staging.vercel.app remains protected by Vercel SSO and points to an earlier P0 build at commit 50263ecdaf7809b0d8ddb4406a48128fadd4d40d. This integration branch has not been deployed there. Its new database migrations require isolated preview database validation and suitable protected preview deployment configuration.

The local VS Code/Codex implementation of P1-05 is not mounted into this chat session. This branch's P1-05 permission viewer was implemented separately; it is not a substitute for reconciliation with the local access-matrix work.
