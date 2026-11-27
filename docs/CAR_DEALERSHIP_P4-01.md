# P4-01 — Customer 360 (registered accounts, read-only)

**Status:** Feature PR stacked on Phase 1–3 integration, not yet deployed.

## Delivered

- Private admin-only Customer 360 directory at /admin/customers with bounded search, status filters, stable 20-row pagination, account counts and responsive cards.
- Private account detail at /admin/customers/[id], displaying contact preferences, verification, marketing consent (read-only), and linked enquiries, test drives, seller requests, favorites and customer-visible messages.
- GET /api/admin/customers and GET /api/admin/customers/[id] require the existing user.view server-side permission. Both use Cache-Control: private, no-store.
- No passwords, account sessions, reset tokens, audit metadata, private staff notes, marketing platform tokens or customer-identity secrets are selected.
- Only rows with UserRole.CUSTOMER and deletedAt=null appear. Accounts are linked to activity by explicit userId foreign keys. Anonymous/guest leads with matching email or phone are **not** automatically identified or merged.
- All relationship sections are bounded to at most 30 recent records; figures are counts of explicitly linked records. This does not claim a global timeline across guest accounts or organizations.
- No new schema migration, staff role, outbound email/phone/WhatsApp integration, automatic marketing activation or payment workflow is introduced.
- Policy/HTTP regression tests cover pagination/filter boundaries, private field selections, denial of unauthorized API access and 404 for missing/other-role accounts.

## Known dependencies and future modules

- P4-02: authenticated customer-follow-up workflow with tasks, ownership and branch-scoped permissions (requires P1-05 role matrix).
- P4-03: guest-to-account identity linking only with explicit consent/verification, never by email equality alone.
- P4-04: customer consent/suppression and retention with controlled data export/erasure requests.
- Tenant/branch ownership is not established by existing User relations alone. Do not enable this CRM in multi-tenant production before full P1-05 organization isolation.
- Existing P0 release gates and protected live browser acceptance remain pending; CI success does not mean the website has been deployed.
