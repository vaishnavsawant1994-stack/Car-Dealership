# P1-09 — Reference Catalog & Shared Validation

**Status:** Feature branch, no live data migration or external provider integration.

Existing Brand, BodyType and Feature tables remain canonical. This work hardens their read/write API contracts and shared Zod validators without introducing duplicate reference tables.

- Catalog resource routing now uses own-property checks, preventing inherited JavaScript properties such as `__proto__`, `constructor` and `toString` from being mistaken for valid resource names.
- Brand and body-type image references accept safe root-relative asset paths or HTTPS URL references. Dangerous schemes, protocol-relative sources and private/loopback IP hosts are rejected.
- Brand website links must be HTTPS and cannot contain embedded credentials.
- Expected unique-key, in-use foreign-key, and missing-record database errors map to deterministic 409/404 HTTP responses instead of generic 500s or raw database errors.
- The catalog edit form remounts when switching records and preserves the form node before awaiting a request; network errors restore the Save button instead of leaving it permanently busy.
- Tests cover resource type spoofing, image URL rules, website URL rules, and valid branded/feature fixtures.

No deletion of referenced records, uncontrolled catalog changes, external messaging or protected staging deployment is permitted by this feature PR. CI, independent review and final acceptance remain separate.
