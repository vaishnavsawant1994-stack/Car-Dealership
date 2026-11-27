# P19: browser acceptance in CI

CI now runs the existing Playwright end-to-end suite against the optimized production build and the disposable loopback PostgreSQL database. The fixture seed creates a random admin password for this runner only; GitHub masks it in logs and passes it only to the same ephemeral job through `GITHUB_ENV`. No staging account or persistent credential is used.

The browser suite exercises customer/staff access, admin workflows, account behavior, and responsive layout. Uploaded vehicle images use the explicit local test-only storage switch inside the disposable runner.

Protected staging visual acceptance, production S3 integration, backup/restore, and rollback remain separate release gates.
