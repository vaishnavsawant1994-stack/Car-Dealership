# Car Dealership development integration status

The latest work is organized as dependency-ordered draft pull requests #38–#52. They have not been merged, migrated to a hosted database, or deployed. This is a review candidate, not a released integration branch.

The P6–P20 roadmap, exact CI evidence, deployment boundaries, and remaining approval gates are recorded in [CAR_DEALERSHIP_P6-P20_RELEASE_LEDGER.md](CAR_DEALERSHIP_P6-P20_RELEASE_LEDGER.md). Current production readiness is summarized in [PRODUCTION_READINESS.md](PRODUCTION_READINESS.md).

The local/F: P1-05 work remains preserved and requires explicit reconciliation against the consolidated role and showroom policy work before release. No role change, migration, staging bypass, or production deployment is authorized by these draft PRs.

## Required before deployment

- Repository privacy and historical credential exposure response.
- Secure staging administrator recovery through private masked input.
- Reconcile P1-05 and complete the broader query and derived-record branch/assignment isolation audit.
- Validate migrations and image storage only against a confirmed isolated preview database and test storage account.
- Complete protected staging desktop/mobile/browser acceptance, backup/restore, monitoring, and rollback.
- Obtain explicit release approval before staging migration, deployment, or client-facing demo.
