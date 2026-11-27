# P1-08 — Audit and Activity Timeline

**Status:** Feature-only work, no production/staging deployment or live mutation.

The existing `AuditLog` remains the canonical append-only evidence table. This feature improves read paths without introducing a second audit source or modifying audit records.

- The page and API use the same bounded filter contract (action/resource exact match, trimmed 120-character search, integer page with a safe upper bound).
- Consistent `createdAt, id` ordering prevents unstable pagination when timestamps collide.
- Both routes read only an explicitly selected set of fields. Legacy JSON metadata, user-agent contents and future columns cannot leak through the audit list API. Hashes are truncated in the response.
- Audit API results use `Cache-Control: private, no-store`.
- The protected UI retains the existing permission requirement and adds a semantic time column.
- Regression tests cover bounded pages, invalid inputs, shared filters and sensitive-field projection.

This does not alter historical records or assert live database integrity. The restricted staging role's `AuditLog` privileges and backup/restore acceptance remain separate P0-07 release gates; no release is authorized by this PR.
