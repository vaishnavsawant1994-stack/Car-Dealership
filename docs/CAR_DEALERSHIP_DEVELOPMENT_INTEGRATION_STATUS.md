# Car Dealership development integration status

The latest work is organized as dependency-ordered open pull requests #38–#57; PR #56 was superseded. None is merged to main. The integration candidate has not been migrated to existing staging or production or deployed. Migration SQL was validated on a fresh temporary child branch of the isolated Neon preview project; Prisma migration-engine bookkeeping remains unverified.

The P6–P20 roadmap, exact CI evidence, deployment boundaries, and remaining approval gates are recorded in [CAR_DEALERSHIP_P6-P20_RELEASE_LEDGER.md](CAR_DEALERSHIP_P6-P20_RELEASE_LEDGER.md). Current production readiness is summarized in [PRODUCTION_READINESS.md](PRODUCTION_READINESS.md).

The local/F: P1-05 work remains preserved and requires explicit reconciliation against the consolidated role and showroom policy work before release. No role change, migration, staging bypass, or production deployment is authorized by these draft PRs.

## Required before deployment

- Repository remains public at the owner's direction. Complete the historical credential exposure scan and remediate any confirmed exposure before deployment.
- Secure staging administrator recovery through private masked input.
- Reconcile P1-05 and complete the broader query and derived-record branch/assignment isolation audit.
- Complete Prisma-engine migration validation and isolated image-storage checks; the current preview child branch validates SQL only and is not a runtime target.
- Complete protected staging desktop/mobile/browser acceptance, backup/restore, monitoring, and rollback.
- Obtain explicit release approval before staging migration, deployment, or client-facing demo.
