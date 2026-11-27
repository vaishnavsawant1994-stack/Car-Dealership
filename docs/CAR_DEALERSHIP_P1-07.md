# P1-07 — Notifications & Action Items

**Status:** Feature branch; no protected staging/demo deployment. Reuses canonical `AdminNotification` table and `notification.view` permission.

## What is implemented

- Staff notification inbox remains scoped to the authenticated user, with a limit of the 100 latest alerts ordered consistently.
- Read/unread filtering, unread counter, individual mark-as-read and mark-all-read controls, loading states, accessible status/error feedback and responsive action buttons.
- The read receipts are idempotent and scoped by `userId`; cross-account notification IDs return 404. Existing `readAt` timestamps are retained.
- Known resource type / ID pairs become deep links only if the current staff role already has the corresponding module view permission. Malformed IDs and unsupported types do not become links. The destination route must still enforce server authorization and ownership.
- API response caching is disabled for staff inbox reads and read receipts.
- Tests cover role-limited deep links, malicious identifiers, current-user query scoping, denied access, idempotent read receipts and the unread filter.

## Deferred/intentional boundaries

- No new notification table, external delivery channel, SMS, WhatsApp, email sender or background agent was added.
- Staff-to-showroom assignments do not yet establish row-level tenant isolation. That must be enforced in the appropriate P1-05 resource policy before broader notification fan-out.
- Only the latest 100 alerts are shown; pagination, richer action priorities and automated scheduling are later enhancements.
- Phase 0 release gates remain deferred at the user's direction; do not treat feature CI as deployment acceptance.
- P1-05 local Codex work was not accessed or overwritten.
