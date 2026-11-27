# P4-03 — Customer marketing consent and suppression

Development status: feature branch, not deployed or activated against real customers.

## Implemented

- Read-only marketing and WhatsApp consent state on Customer 360, including the original opt-in date if recorded.
- Staff withdrawal of one of two promotional channels via POST /api/admin/customers/[id]/privacy/withdraw, requiring user.update at the backend.
- No staff opt-in endpoint, no ability to change account-transactional notifications, no external provider/messaging integration.
- Withdrawal writes an atomic update and an audit event with only the channel name (not contact details). Repeated withdrawals do not create duplicate audit events.
- Current consent evaluates false if settings are missing, the opt-in timestamp is absent, or the boolean is false. The historic timestamp remains for compliance evidence but is never treated as current permission.
- Unit, HTTP authorization and isolated PostgreSQL tests cover missing consent, bad inputs, permission denial, idempotency and minimal audit metadata.

## Requirements before release

- A *customer-authenticated, verified and auditable* self-service opt-in flow is needed for any new promotional consent; staff cannot grant marketing consent.
- Every future campaign sender must consult the central suppression policy and per-channel eligibility at send time. A CRM checkbox by itself does not enforce third-party campaigns.
- Branch/tenant row isolation and P1-05 local Codex work remain unresolved. Do not enable CRM against multi-tenant real customer records.
- Complete verified data-rights requests, export/delete controls, consent history retention policy and external provider suppression before production launch.
- Keep staging SSO protected and external email/SMS/WhatsApp/payment disabled throughout development.
