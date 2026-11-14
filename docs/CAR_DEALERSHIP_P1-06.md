# P1-06 — Unified Operational Settings

**Scope:** Safe staff-managed configuration, built on the canonical `SiteSetting` model and existing admin permissions. This PR is feature development only; it does not deploy or alter staging/demo data.

## Implementation

- `lib/admin/settings-policy.ts` defines an explicit allowlist and category for every currently seeded `SiteSetting` key. Unknown keys and category-spoofed rows never appear in the editor and cannot be mutated through the API.
- Settings related to infrastructure and communication controls (`site_url`, currency/locale/timezone, email capture state) are read-only in the admin editor. Secrets and provider credentials remain outside the database editor.
- Hosted fictional environments (`staging`, `demo`, `preview`) cannot activate phone, WhatsApp or external social destinations through the settings editor. Hosted contact email updates are restricted to reserved `@car-dealership.test` recipients.
- Outside hosted demos, social links must use HTTPS and a hostname matching the selected platform; javascript/HTTP, credentialed URLs and lookalike hostnames are rejected.
- The `PATCH /api/admin/settings/[key]` route enforces the policy on the server before a versioned database update. The existing `settings.update` permission, optimistic `version` control and audit event remain in place.
- The settings screens only render registered keys in their canonical category, and users without the update permission see read-only values.
- Regression tests cover unknown/secret keys, category spoofing, hosted communication restrictions, approved email domains, infrastructure settings and social URL safety.

## Acceptance boundaries

- No schema migration, account provisioning, payment activation or external messaging.
- No live E2E claim. Exact-head CI must pass lint, type checking and tests before merging.
- P1-02 organisation-profile integration remains a separate feature; reconcile settings semantics when that feature is merged.
- No release to staging or client demo until the project release gates are satisfied.
