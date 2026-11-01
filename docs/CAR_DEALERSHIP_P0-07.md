# P0-07 — Security, Isolation and Disaster Recovery

Date: 2026-11-01. Status: in progress, alongside unfinished P0-06. Scope: Car-Dealership staging and demo ONLY.

## Live read-only baseline
- Staging project empty-dew-20186400, original branch br-snowy-union-aoz83v84, DB car_dealership_staging, fingerprint e0a5faff-8c8a-4955-b70e-f5c1c17c38eb.
- Demo project young-paper-44003842, branch br-nameless-sea-a129d9oy, DB car_dealership_demo, fingerprint 37edbbfe-3ed1-4f34-9d75-a7a13ec05720.
- Both databases show four fictional vehicles, eight completed migrations, no active superadministrators.
- Staging role cd_staging_app has LOGIN, no memberships, NOINHERIT, cannot create schema, roles, database, modify environment identity, or write migration history. Demo role cd_demo_app has NOLOGIN with the same restricted rights.
- No automatic snapshot schedule was present on either branch at audit. Backup scheduling, retention and cost approvals are pending.
- Vercel staging remains SSO protected and READY. P0-06 is still open; external messaging/payment remains disabled.

## Recovery exercise and important Neon hazard
1. On 2026-11-01, created snapshot snap-wandering-tooth-ao72wvwl from the original staging branch.
2. A restore_snapshot call with omitted target and default finalize=true unexpectedly promoted the restored copy and swapped compute attachments and branch names. Do NOT use that mode for non-promoting recovery verification in a live project.
3. Reestablished ORIGINAL staging branch br-snowy-union-aoz83v84 as primary/default and restored the name staging.
4. Original compute ep-red-king-ao2lq5tj (and ep-red-king-ao2lq5tj-pooler) was moved back onto original staging. Temporary buffer branch br-fragrant-hill-ao0w1gd3 carries ep-delicate-feather-aoxbcaak.
5. Independent restored data copy br-cold-thunder-ao0rv7cx is named p007-snapshot-restore-copy-2026-11-01. Prior to compute reassignment its database fingerprint, four vehicles and eight migrations were verified by SQL.
6. Rechecked original staging: exact fingerprint, default=true, primary=true, correct original compute hostname, four vehicles and eight migrations. Vercel staging deployment still READY.

Conclusion: source database/hostname restored to original provider state, and a recoverable snapshot copy was verified. This is NOT a proven zero-downtime failover, restore RTO or recovery point objective.

## Security changes in this PR
- Reject staging/demo cross-connections even when EXPECTED_DATABASE_NAME is changed to match the wrong database.
- Add pure fingerprint and least-privilege role attestations with negative tests.
- Provide a fully read-only runtime verifier that refuses privileged owners and non-fictional users; it does not migrate, seed or alter data.
- Make the regression suite a named GitHub CI gate: npm run security:p007:tests.
- Run npm run security:p007:readonly only from a secrets-protected runner with the correctly scoped restricted runtime DATABASE_URL, APP_ENV, APP_PROJECT_ID, EXPECTED_DATABASE_HOST, EXPECTED_DATABASE_NAME, EXPECTED_DATABASE_ID. Never put secrets in CI logs or issue descriptions.

## Open acceptance gates
- Confirm exact-head CI on P0-07 PR and review before merging. Do not auto-deploy this PR.
- Complete actual wrong-environment credential denial tests using isolated test credentials.
- Test an explicitly non-promoting snapshot recovery procedure in a separate sandbox; never finalize a restore to live staging.
- Configure and verify snapshot schedule/retention and document RPO, RTO and costs.
- Verify private media isolation and recoverability, audit-event integrity and rate-limit behavior.
- Resolve outstanding P0-06 admin authentication, image upload and remaining temporary Vercel bypass credentials in Issue #3.
- Review TLS compatibility warning while maintaining certificate verification; recheck dependency advisories and legal media licenses.
- Keep demo undeployed and all real external messaging and payments disabled until approved.

Important: This runbook records the P0-07 recovery hazard and remediation factually. Extra test branches and snapshot remain for reviewed cleanup; deletion requires separate authorization.
