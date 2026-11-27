# P9 — Payment sandbox abstraction

## Implemented

- Added a provider interface with a deterministic local simulator. It makes no network requests and accepts no card, bank, token, or customer payment credentials.
- Added an explicit environment guard: payments default to disabled and the simulator is enabled only when `PAYMENT_MODE=sandbox` and `APP_ENV` is `test` or protected `preview`. `live`, staging, demo, local, and commercial modes remain disabled.
- Added idempotent synthetic attempts against finance worksheets. Attempts record only an INR amount snapshot, simulation outcome, actor, and synthetic reference; no invoice/deal state is changed.
- Added a gated admin UI action, private API, audit events, migration checks, and replay/conflict handling.

## Explicit limits

- This is only a simulator; no payment provider SDK, credentials, capture, authorization hold, settlement, refund, webhook, or live mode exists.
- Preview must remain behind SSO. The sandbox UI is hidden unless the explicit sandbox mode is configured.
- Database migration and tests are limited to isolated CI/preview; production and existing staging were not touched.
