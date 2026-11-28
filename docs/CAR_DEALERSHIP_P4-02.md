# P4-02 — Internal Customer Follow-up Tasks

**Status:** Feature PR stacked on P4-01; not deployed.

## Purpose

Allow authorized administrators to create and complete private reminders associated with a registered customer's Customer 360 record. This extends the existing OperationalFollowUp table rather than introducing a second task store.

## Implemented

- Customer 360 follow-up panel with task title, future due date and a verified administrator assignee; recent follow-ups show current completion and assigned staff.
- Reuses OperationalFollowUp with resourceType Customer and resourceId equal to the canonical User.id.
- Creates tasks in a Serializable PostgreSQL transaction after verifying the registered customer is not deleted and the assignee is active, email-verified and has an administrative role.
- Due dates must be in the future and no more than 366 days away. Task titles are bounded and the JSON schema excludes unrecognized/external-delivery fields.
- Task completion uses an idempotent updateMany predicate scoped to exact customer resourceType/resourceId and completedAt=null. A repeat completion does not create another audit record.
- Creation and completion write independent AuditLog events inside the same transaction; audit metadata excludes task title and customer contact details.
- The API routes require the existing user.view server permission. No customer contact, email, SMS, WhatsApp or payment is sent by task creation/completion.
- Regression tests cover due-date validity, schema strictness, wrong-customer task access, idempotency and audit records against isolated CI PostgreSQL.

## Limits

- Only administrators can be assignees because the existing Customer 360 is admin-only. P1-05 must establish tenant/branch ownership rules before branch staff access or cross-organization fan-out is considered.
- No realtime notifications, cron reminders, automatic overdue escalations or task deletions. Those are separate future enhancements.
- This feature is a staff work queue, not a customer engagement channel or consent to contact.
- Final release gates for repository privacy, secure staging Super Admin recovery and protected browser acceptance remain deferred, not bypassed.
