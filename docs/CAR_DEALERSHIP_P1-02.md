# P1-02 — Organisation & Business Profile

Status: implemented on a dedicated development branch. Protected staging and demo are not changed.

## Existing entities reused

- **SiteSetting**: one versioned row per allowlisted organisation field. No duplicate Organisation model, second settings table or migration.
- **Showroom**: the sole source for primary showroom address, operating hours and contact information; the new page presents a linked read-only summary and routes permitted staff to the existing showroom editor.
- **User** and existing role permissions: `settings.view` to read, `settings.update` to edit, and `showroom.manage` to maintain showrooms. No new user role.
- **AuditLog**: one change event written atomically with all setting changes; metadata records only field names, never submitted values.

## Implemented frontend and backend

- Responsive `/admin/organisation` screen using the existing dark/gold admin design system. Editable business identity, approved logo URL and tagline, fictional contact details, currency, timezone, locale, registration metadata and primary showroom summary.
- Clear read-only state for content managers and edit controls for admins. The active showroom link appears only for staff with `showroom.manage` permission.
- Added a management sidebar entry and a business-profile card from the existing Settings overview; the pre-existing General/Contact/SEO settings pages remain intact.
- GET and PATCH `/api/admin/organisation` enforce server-side permissions, `Cache-Control: private, no-store`, explicit field allowlist, bounded values and optimistic versions.
- Save is an all-or-nothing SERIALIZABLE transaction: `version=0` allows first-time creation; existing rows require an exact version. Conflicts return 409 and do not partially save.
- A single audit event is written inside the same transaction without secret value data. Settings remain staff-only. Hosted public website brand remains a neutral demonstration identity.
- The original `/api/admin/settings/[key]` PATCH now applies the same organisation field policy. Older settings pages cannot bypass the demonstration contact and legal-identifier rules.

## P0 demo safety

- Hosted preview/staging/demo names must visibly indicate a demo; addresses use reserved `@car-dealership.test` only.
- Real phone numbers, registration numbers and tax identifiers are rejected in hosted demos. Logo URLs are limited to approved paths under `/images/brand/`.
- No external email, SMS, WhatsApp, payments, OAuth or real customer-registration features are enabled.
- No commercial profile or external contact activation is implied by this development PR.

## Tests and acceptance

- Unit tests cover allowed/unknown/duplicate fields, safe logo URLs, enum bounds, fictional identity/contact rules, legacy Settings policy wiring and role restrictions.
- Isolated CI PostgreSQL integration verifies new setting creation, atomic rollback on stale version, version increments and audit metadata minimization.
- GitHub Actions exact-head validation is required before review/merge; no hosted DB mutation, Vercel deployment or P0-06 credential activation is part of this work.
- Authenticated browser workflow is not claimed to pass while the separate P0-06 Super Admin fixture remains disabled.

## Following stage

**P1-03 — Branch & Showroom Management.** Extend the existing `Showroom` and related permissions; do not duplicate address records in SiteSetting or introduce a parallel branch table without a reviewed tenant/branch model.

P0-06/P0-07/P0-08 release acceptance remains open. No branch merges or deployment unless separately reviewed.
