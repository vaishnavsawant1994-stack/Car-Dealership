# P4-04 — Customer data-rights request intake

Development status: implemented on a feature branch, no live customer records processed.

## What works

- Authorized dealership administrators can log three types of private customer data-rights requests: access, correction, and erasure.
- A new CustomerDataRightsRequest record is linked by existing User ID; requests require the customer to be an existing nondeleted registered customer account.
- All requests start in PENDING_ID_VERIFICATION. Intake does **not** authenticate the person making the request, grant access, export customer information, erase records, or mark verification complete.
- Idempotent creation detects an existing pending request of the same type for the same customer. A PostgreSQL partial unique index prevents duplicate open requests under concurrent requests.
- Request metadata is restricted to kind, staff creator, timestamps and status. No reason/narrative text is collected, minimizing the accidental storage of sensitive personal information.
- Backend requires the existing user.update permission; no client-side role-only workaround. A restricted private API and Customer 360 panel show recent requests.
- Each new request is written in a serializable transaction with an audit event; repeated requests do not create duplicate audit entries.
- Tests cover unsupported/extra fields, permission denial, non-destructive intake, original customer-record retention, duplicate prevention and audit integrity.

## Required before closing a data-rights request

A separate approved identity verification and privacy operations workflow must include:
- Confirmed person/account matching without email-only inference.
- Legal basis and retention evaluation, litigation/fraud/accounting record holds as applicable, and independent authorization.
- Export preparation and delivery to the verified person over an approved secure channel.
- Reviewed correction or deletion action with relational integrity checks and reversible backups when lawful.
- Restricted staff audit evidence that is not used to invent compliance or override consent.
- Applicable regional law and policy review.

This feature deliberately has **no erasure/export execution endpoint**. No staging migration, customer outreach or external delivery is activated until final release acceptance.
