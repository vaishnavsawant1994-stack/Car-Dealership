# Customer Authentication and Account Milestone

Date: 2026-08-03

## Delivered scope

- Auth.js credentials authentication with optional Google OAuth.
- Argon2id password hashing and a 12-character complexity policy.
- Customer registration, email verification, verification resend, forgot password, one-time password reset, change password and logout-all-devices.
- Verified/active account enforcement plus session-version revocation.
- Persistent database favourites with optimistic UI, canonical guest storage and automatic migration from `inventory-favorites` and `deccan-favorites` after sign-in.
- Protected account overview, favourites, enquiries, test drives, sell requests, profile, notifications and security pages.
- Customer-facing references for enquiries, test drives and sell requests.
- Owned record detail pages, customer-visible follow-up messages, enquiry cancellation, test-drive cancellation and test-drive reschedule requests.
- Request rate limiting, duplicate public-submission protection, safe callback URLs and security audit events.
- Transactional email integration using Resend, with explicit preview-only behavior when no development API key is configured.

The admin dashboard is intentionally not part of this milestone.

## Environment

Copy `.env.example` to `.env` and configure the database as described in `DATABASE_SETUP.md`.

Required for authentication:

```text
NEXT_PUBLIC_SITE_URL=http://localhost:3001
AUTH_SECRET=<long-random-secret>
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=<same-long-random-secret>
```

Optional Google sign-in:

```text
AUTH_GOOGLE_ID=<google-client-id>
AUTH_GOOGLE_SECRET=<google-client-secret>
```

The Google button is hidden unless both variables are configured. Add this authorized callback URI in Google Cloud:

```text
http://localhost:3001/api/auth/callback/google
```

Transactional email:

```text
RESEND_API_KEY=<resend-api-key>
AUTH_FROM_EMAIL=Deccan Wheels <accounts@your-verified-domain.example>
```

Without `RESEND_API_KEY`, development logs an `email_preview` entry containing the safe local verification/reset URL and explicitly reports `preview: true`. Production fails closed if the key is missing; it never claims an email was delivered.

## Development accounts

Running `npm run db:seed` creates:

```text
Verified customer: customer@deccanwheels.local
Pending customer:  pending@deccanwheels.local
Password:          Set `SEED_ADMIN_PASSWORD` in your ignored local `.env` file before seeding.
```

The verified customer includes saved vehicles, one tracked enquiry, one confirmed test drive, one sell request and notification preferences. The pending customer is useful for testing verification enforcement. The seed requires a valid locally configured password and refuses to run against a non-local or production database. Do not commit or reuse the local password.

## Main routes

Public authentication:

- `/login`
- `/signup`
- `/verify-email`
- `/forgot-password`
- `/reset-password`
- `/favorites`

Protected customer account:

- `/account`
- `/account/favourites`
- `/account/enquiries`
- `/account/enquiries/[reference]`
- `/account/test-drives`
- `/account/test-drives/[reference]`
- `/account/sell-requests`
- `/account/profile`
- `/account/settings`
- `/account/security`

## Security behavior

- Passwords are never stored or logged in plaintext.
- Verification and reset tokens are random, stored only as SHA-256 hashes, expire, and can be claimed only once.
- Forgot-password responses remain neutral whether an account exists or not.
- Password reset/change and logout-all increment `sessionVersion`, invalidating all JWT sessions.
- Account pages query the current database user and reject inactive, unverified, deleted or revoked sessions.
- Enquiry and test-drive queries always include the authenticated `userId`; knowing another reference does not grant access.
- Internal assignment data and non-customer-visible messages are never selected for customer pages.
- Marketing email and WhatsApp consent are separate, optional settings with consent timestamps.

## Database migration

Migration `20260803191500_customer_accounts` adds Auth.js adapter tables, account state, token tables, notification settings, engagement messages, atomic reference counters, ownership indexes and expanded customer request statuses. Existing enquiries and test drives are retained and receive `DW-*-LEGACY-*` references.

Apply and seed:

```powershell
npx prisma migrate deploy
npm run db:generate
npm run db:seed
```

## Verification

```powershell
npm run db:health
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Coverage includes password and token security, input normalization, callback safety, seeded account ownership, guest-record preservation, verified and pending login behavior, favourite migration and cross-account record isolation.

## Dependency audit

`sharp` is pinned to patched version `0.35.3` through an npm override. As of 2026-08-03, `npm audit --omit=dev` still reports two affected package entries (`next` and its bundled `postcss`) covering three PostCSS advisories. Next.js `16.2.12` bundles PostCSS `8.4.31`; it is the current stable Next.js release, and npm offers only an unsafe downgrade to Next.js `9.3.3`. Do not apply that forced downgrade. Re-run the audit and remove this note when Next.js publishes a compatible patched release.
