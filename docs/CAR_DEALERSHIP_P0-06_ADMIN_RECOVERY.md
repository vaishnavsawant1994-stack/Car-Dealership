# P0-06 — Fictional staging Super Admin credential recovery

## Purpose
The fictional `demo.admin@car-dealership.test` account was provisioned with a
random Argon2id password that was intentionally not retained. It is not possible
to recover that password. Hosted password-reset emails are intentionally
encrypted and Super Admin-only, so they cannot safely bootstrap an operator
with no working authenticated session.

The one-purpose, offline maintenance command
`npx tsx scripts/rotate-staging-admin-password.ts` rotates only this
fictional staging Super Admin account under a verified, approved identity.
It is not an application endpoint and must not be exposed or wired to a
Vercel deployment.

## Execution boundaries
- Use an ephemeral, private execution environment and the approved
  Car-Dealership **staging** database connection. The recovery command requires
  `cd_staging_app` over `sslmode=verify-full`; it rejects owner logins,
  libpq-compatibility overrides, privileged role attributes, inherited role
  memberships, missing mutation privileges, or mutable AuditLog privileges.
- Require `APP_ENV=staging`, `APP_PROJECT_ID=car-dealership`,
  `EXPECTED_DATABASE_ID`, `DIRECT_URL`,
  `P006_STAGING_RESET_APPROVED=true` and
  `P006_STAGING_RESET_EMAIL=demo.admin@car-dealership.test` in a disposable
  private maintenance process.
- Never put these recovery inputs in Git, Vercel deployment environment
  variables, CI secrets or shell history. Do not send passwords in chat.
- Enter the password only at the script's hidden interactive TTY prompt. It
  requires stdin and stdout to be TTYs, enables raw mode, does not echo or log
  characters, pauses stdin after entry, restores terminal mode on completion/
  cancellation, rejects a closed or errored TTY, and rejects
  `P006_STAGING_NEW_PASSWORD` if present. The operator must securely
  receive/choose the new password; random unretained passwords reproduce the
  original lockout.
- The program checks the environment identity with a row lock, verifies the
  exact account role/active/verified/provisioned state, and atomically rotates
  the Argon2id password, increments `sessionVersion`, deletes database
  sessions, invalidates reset tokens and creates an audit record.
- On any mismatch or database error, roll back and stop. No real email,
  external messaging, customer data or other project may be accessed.
- After password setup, test the actual protected NextAuth sign-in, session
  checks, role denials, sign-out and authenticated image upload through the
  production-shaped staging routes. Clean synthetic images after testing.
- Keep P0-06 blocked until all authenticated acceptance gates pass. Do not
  deploy client demo or merge P1 features to release until acceptance.

## Current status
Recovery code provided for review/CI. **No password has been changed
by merging or viewing this PR**. This command needs an operator-held
credential to enable usable login, plus reviewed, one-off execution in
a disposable maintenance process.

## Recovery-command hardening (2026-11-02)

The command now requires the direct connection URL to identify `cd_staging_app`
and the current staging endpoint `ep-red-king-ao2lq5tj`, and contain exactly
`sslmode=verify-full`; it rejects restore-branch endpoints, owner credentials,
and `uselibpqcompat`. It is pinned to the verified staging database fingerprint
`e0a5faff-8c8a-4955-b70e-f5c1c17c38eb`. A read-only preflight validates the exact staging fingerprint,
active verified fictional Super Admin, role attributes, required table grants,
and append-only AuditLog privileges before opening the masked password prompt.
The mutation transaction repeats those checks with row locks, rejects reuse of
the current password, and only then clears the in-memory password and commits
the session/token revocation and audit event. No staging write or password
prompt has been run. The latest read-only account check found one unused reset
token; the approved rotation transaction invalidates outstanding tokens.

Validation after this hardening: focused recovery tests **22 passed**, full
local PostgreSQL CI-style suite **14 files / 91 tests passed**, lint and
typecheck passed. This is local test evidence; PR exact-head CI and independent
review are still required before any live recovery.
