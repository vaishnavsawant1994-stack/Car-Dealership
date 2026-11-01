# Admin Operations Guide

## Development access

Run the app at `http://localhost:3001` and open `/admin`.

Set a unique `SEED_ADMIN_PASSWORD` in your ignored local `.env` file before running `npm run db:seed`. The seed refuses to continue without a valid password. Never commit or reuse this value outside the local development database.

| Role | Email |
| --- | --- |
| SUPER_ADMIN | `superadmin@deccanwheels.local` |
| ADMIN | `admin@deccanwheels.local` |
| SALES | `sales@deccanwheels.local` |
| OPERATIONS | `operations@deccanwheels.local` |
| CONTENT_MANAGER | `content@deccanwheels.local` |

The account emails and roles are deterministic development fixtures; their password is chosen locally and is not stored in the repository.

## Daily workflow

1. Review dashboard actions, overdue work, upcoming drives and inventory alerts.
2. Assign new enquiries, contact messages, drives and sell requests to the correct active staff member.
3. Record private notes separately from customer-visible messages.
4. Confirm or reschedule test drives only after checking the displayed appointment details.
5. Complete sell inspections before producing a valuation or customer offer.
6. Keep vehicle status and publication state separate; use the readiness checklist before publishing.
7. Review notifications and audit history for privileged changes.

## Inventory

Create records as drafts. Add at least three public images and designate one primary image. Move the draft to `AVAILABLE`, review readiness, then publish. Status changes requiring business context ask for a reason and create status/audit history. Safe bulk actions validate every selected record and report partial success.

## Content and settings

Testimonials and gallery items become public only when `published` is enabled. Structured content stores revisions. Settings use optimistic versions and cannot expose secret-like keys. The primary showroom is unique and drives active contact information.

## Staff

Invite staff from `/admin/users/invite`. The development email service returns a preview link. An optimized local E2E preview can opt in with `ALLOW_EMAIL_PREVIEW=true`; never set it in a deployed environment. Production otherwise requires `RESEND_API_KEY` and fails closed. The token expires after 48 hours, is stored only as a hash and cannot be replayed. Staff choose their own Argon2id password.

## Exports

CSV exports are generated on the server, permission checked, row limited, audited and protected against spreadsheet-formula injection. Export only the business data necessary for the workflow.

## Recovery messages

- `EDIT_CONFLICT`: reload before resubmitting.
- `NOT_READY`: complete the publication checklist.
- `INVALID_TRANSITION`: choose an allowed next workflow state.
- `FORBIDDEN`: the signed-in role or assignment does not permit the operation.
- Expired invitation: issue a new invitation; do not reuse the old link.
