# Car-Dealership — P0-05 Authentication and Communication Sandbox

**Phase:** P0-05 • **Status:** Code/data safeguards complete, hosted credentials and deployed integration pending

## Purpose

Provide controlled, test-only authentication and encrypted communication previews while guaranteeing that the demonstration cannot send mail, SMS, WhatsApp messages or payments to external recipients. No UI redesign is included. No live account credentials are stored in the repository.

## Implemented

1. **Identity restrictions:** Hosted `APP_ENV=staging|demo|preview` does not permit open registration, real-domain logins, OAuth providers or staff invitations. Hosted accounts must have `@car-dealership.test` addresses. Commercial mode remains blocked by the existing Phase 0 configuration.
2. **Safe demo accounts:** The repeatable `prisma/demo-seed.sql` now adds five disabled, passwordless staff fixtures alongside fictional customers: super administrator, manager, sales, operations and content. No account can sign in until deliberately activated.
3. **Account activation:** `npm run demo:account:provision` is a one-use, identity-gated script. It requires `APP_ENV`, `APP_PROJECT_ID`, `EXPECTED_DATABASE_ID`, `DIRECT_URL`, `DEMO_BOOTSTRAP_APPROVED=true`, `DEMO_BOOTSTRAP_EMAIL`, and a unique 20+ character `DEMO_BOOTSTRAP_PASSWORD`. It can activate only the explicitly approved fictional fixture addresses and roles, writes Argon2id password hashes and an audit record, and refuses already activated accounts. It has **not been run**. Never put bootstrap secrets in GitHub or Vercel runtime variables; provide them only to the one-time controlled command through a secure ephemeral environment.
4. **Email capture instead of external delivery:** All outbound mail is blocked. In hosted environments, email to reserved `.test` recipients is encrypted using AES-256-GCM and an environment-specific `EMAIL_CAPTURE_KEY` and stored in `CapturedEmail`. The stored fields are purpose, HMAC recipient hash, ciphertext, nonce, tag and expiry; not raw email contents or bearer URLs. If the encryption key is absent, the operation fails closed. Local/test without a key simply disables email with no preview.
5. **Scoped capture viewing:** `GET /api/admin/email-captures` shows only non-sensitive metadata. `GET /api/admin/email-captures/:id` decrypts only for a currently authenticated `SUPER_ADMIN` with `emailCapture.view` permission and records an audit event. Cache-control prevents response caching. Sensitive bearer links are never returned through public APIs.
6. **Expiry and retention:** Verification captures expire after 24 hours; password reset captures after 30 minutes; staff invitation captures after 48 hours; other captures after 7 days. `npm run email:capture:purge` provides a fingerprint-gated cleanup command. It must be scheduled separately in P0-06/P0-07 and requires an authorised migration/maintenance credential.
7. **Public form safety:** Contact, enquiry, test-drive, sell-request and newsletter POST routes return 403 in hosted noncommercial demonstrations. The real CRM screen can still use pre-seeded fictional enquiries and sample appointments. Until further validation, public demo visitors cannot accidentally submit real contact details.
8. **Non-email channels:** Public WhatsApp calls were already routed to the internal contact page in P0-03. No external SMS, voice, WhatsApp gateway, payment service, email-delivery provider or marketing API has been configured or enabled for the new application.
9. **CI independence:** The CI ephemeral PostgreSQL database is now `car_dealership_test`; the application accepts no legacy DB name exception. The GitHub quality workflow tests application migrations, lint, type checking and unit tests.
10. **Safety preflight:** The hosted build requires a strong unique `AUTH_SECRET`, a valid 32-byte base64url `EMAIL_CAPTURE_KEY`, matching HTTPS site/auth origins, and isolated database/storage configuration. It rejects accidentally inherited OAuth variables and any bootstrap password/approval flags in long-running deployments.

## Provisioned independent infrastructure

**Staging:** Neon project `empty-dew-20186400`, database `car_dealership_staging`, fingerprint `e0a5faff-8c8a-4955-b70e-f5c1c17c38eb`.

**Demo:** Neon project `young-paper-44003842`, database `car_dealership_demo`, fingerprint `37edbbfe-3ed1-4f34-9d75-a7a13ec05720`.

Both have eight recorded Prisma migrations, including `20261031170000_demo_email_capture`, 43 tables, five disabled staff demo identities, no staff passwords and no captured email yet. Both restricted application permission roles can read/write the email outbox; they cannot change database identity/migration history or create tables, and still have NOLOGIN until protected deployment credential setup.

## Required controls and readiness

- The GitHub repository remains public and has no enforced branch protection; **do not use real customer data, credentials or external logins.**
- Protected staging/demo deployment, Vercel environment variables, isolated auth secrets, dedicated 32-byte encryption keys, safe application DB logins, automated outbox cleanup, full email capture integration and backup/restore remain P0-06/P0-07.
- Superadmin must be activated only after protected deployment access is configured. A passwordless disabled fixture is not an active admin account.
- The encrypted outbox requires a real hosted integration test with provider credentials, covering capture, superadmin-only read, token expiry, tamper rejection and cleanup. Passing a unit test alone is not an end-to-end verification.
- The current demo is intentionally **read-only for public form submissions**. Re-enable only using an approved synthetic-data validation policy in a later controlled phase.
- No external website/deployment has been launched or connected to these databases.

## Acceptance tracking

| Gate | Result |
|---|---|
| Open registration/real-email demo guard | Implemented, CI unit-tested |
| Independent OAuth and secret requirements | Implemented, keys not yet provisioned |
| Encrypted capture persistence | Implemented, hosted end-to-end pending |
| Superadmin-only audited mailbox API | Implemented, hosted end-to-end pending |
| Synthetic staff fixture accounts | Created in staging and demo, disabled |
| One-time password provisioning | Prepared, intentionally not run |
| Independent PostgreSQL schema migration | Applied to both |
| No live email or communications delivery | Enforced by code |
| Expiration cleanup | Command prepared, scheduling pending |
| Full P0-05 deployed acceptance | Pending P0-06 protections |

**Next:** P0-06 independent protected Vercel deployments, credentials, service connection and full end-to-end tests. No source-business resources were accessed or changed during P0-05.
