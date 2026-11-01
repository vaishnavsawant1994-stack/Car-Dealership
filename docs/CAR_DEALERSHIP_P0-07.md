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


## 2026-11-01 P0-07 continuation: independent read-only verification and hosted runtime hardening

The staging and demo databases were checked again through their own Neon project and branch selectors. Both report:
- Their expected independent instance fingerprints, exactly 4 fictional vehicles, 8 completed migrations, 0 failed/pending migrations, 0 active SUPER_ADMIN accounts, 0 saved passwords, and 0 non-fictional user email addresses.
- Only each environment's own restricted role is present. Cross-environment roles are absent. Staging runtime role has LOGIN; demo role has NOLOGIN. Both have zero memberships and no schema CREATE, role/admin privileges, migration history writes, or environment-identity writes.
- Public buckets are public_read and private buckets are private. No additional storage write, image lifecycle, or live cross-project credential test was carried out in this continuation.
- Automatic snapshots are NOT scheduled in either database. A snapshot also exists for the demo baseline: snap-lingering-credit-a1g4ew3p. Staging snapshot snap-wandering-tooth-ao72wvwl remains available. These manual snapshots do not substitute for a tested retention policy.

An earlier Issue #3 update claimed the temporary staging deployment automation-bypass credentials were revoked and the synthetic image probe removed. The probe's exact key was subsequently confirmed absent. Current bypass-record status could not be independently verified through the connected Vercel API or logged-out browser, so dashboard verification remains outstanding. Do not re-enable any automation bypasses in P0-07. The prior note that the fictional Super Admin was disabled/passwordless is stale: the latest read-only database check found the account active and email-verified with a password hash, but no recorded login or sessions. Recovery and authenticated E2E tests remain outstanding.

This PR additionally validates the exact application database login username and requires TLS with sslmode=require or sslmode=verify-full in staging/demo. It rejects owner logins, cross-environment runtime roles, missing/disabled/ambiguous SSL options, and uselibpqcompat overrides. Importantly, the migration/seeding URL validator remains separate and does not require the runtime user, while the normal Prisma runtime and read-only verifier enforce the restricted role.

**TLS follow-up:** The existing staging build uses a pg library that presently treats sslmode=require as verify-full and emits a compatibility warning. Explicit sslmode=verify-full is the target before the next major pg upgrade. Do not alter the deployed environment or weaken certificate verification as part of this draft PR.

**Acceptance unchanged at that earlier check:** This is a CI-tested code-level baseline, not a proof of real credential cross-project denial, production-grade RTO/RPO, or final phase sign-off. Backup schedules could incur provider costs; select retention and budget before enabling. No main merge, app redeployment, or privileged account activation was performed.

## Blocking P0-07 audit-integrity finding (2026-11-01)

Both hosted application roles currently have SELECT, INSERT, **UPDATE and DELETE** rights on `public."AuditLog"`. The reviewed application paths read and append audit events, so a compromised runtime could alter or remove its audit history.

The read-only verifier now requires `canInsertAuditLog=true`, `canUpdateAuditLog=false`, and `canDeleteAuditLog=false`. The live verifier must report FAILED until these grants are corrected; do not bypass the failure.

**Proposed SQL — NOT executed on either live database:**

```sql
-- Run separately with approval after verifying staging/demo project fingerprints and application audit use.
REVOKE UPDATE, DELETE ON TABLE public."AuditLog" FROM "cd_staging_app";
-- Run the following command ONLY in the independent demo project/database:
REVOKE UPDATE, DELETE ON TABLE public."AuditLog" FROM "cd_demo_app";
```

Review P0-06 runtime impact before applying, and afterward verify INSERT remains available and UPDATE/DELETE are denied. No database permission changes were made during this continuation.

### Cross-branch negative-role test

Read-only Neon queries requesting staging's `cd_staging_app` role against the demo branch and demo's `cd_demo_app` against staging both failed with 'role not found for branch' (HTTP 404). This verifies branch role separation, not a real stolen-credential or TLS-level denial test; that remains pending.

## 2026-11-01 non-promoting restore drill

The staging snapshot `snap-wandering-tooth-ao72wvwl` was restored with `finalize:false` to a separate branch `p007-nonpromoting-drill-2026-11-01` (`br-empty-pond-aoikialy`). Provider metadata confirms the drill branch is `ready`, `primary=false`, and `default=false`; original staging remains `primary=true` and `default=true`. The restricted `cd_staging_app` login read the restored identity row and verified environment `staging`, the expected staging fingerprint, 4 vehicles and 4 vehicle-image rows. It returned the same counts and identity from the original staging branch. No staging row or compute attachment was changed.

The restored branch has **no object-storage buckets**, although it has four image rows. The database snapshot did not restore vehicle media or private seller documents. Database-only restore therefore does not establish full application recovery. The snapshot point was `2026-11-01 03:24:49 UTC`, about 11h52m before verification at 15:16 UTC; automatic snapshot schedule is empty and the current plan exposes a 6-hour history window. Neon’s [published snapshot guidance](https://neon.com/blog/three-ways-to-use-your-snapshots) says scheduled snapshots are available on paid plans. The requested daily, 30-day schedule therefore requires a plan change, which is not authorized automatically. Neon automatically created endpoint `ep-sweet-bread-ao4l34yq` for the drill; it was suspended after verification, and provider state confirms it is idle. The temporary branch remains for review; do not delete it without authorization.

**Drill result:** Non-promoting database restore is verified. Overall P0-07 remains incomplete: no full storage restore, timed RTO measurement, recurring retention policy, approved cost plan, true cross-project credential denial, or audited runtime-role grant correction has been completed.

## 2026-11-01 follow-up: verifier logging and current Neon state

Commit `4bccd08bf173170f6c56c5a182ef97213c67930f` hardens the read-only verifier failure handler: it now logs only a validated exception class and never includes raw exception/provider text. Local typecheck, lint, focused security tests (24 tests), and full non-integration tests (65 tests) passed; exact-head GitHub CI is pending.

A fresh provider read confirms the staging branch `br-snowy-union-aoz83v84` remains `primary=true`, `default=true`; the non-promoting drill branch `br-empty-pond-aoikialy` remains non-primary/non-default. Drill endpoint `ep-sweet-bread-ao4l34yq` is idle and suspended since `2026-11-01T15:16:44Z`. Staging's snapshot schedule is still empty. The restored drill branch still exposes no storage buckets. Existing temporary drill/buffer branches and snapshots are retained for review; no cleanup or live permission changes were performed.
## TLS compatibility warning verification

The current checkout resolves `pg` 8.22.0 and `pg-connection-string` 2.14.0. Locally parsing a non-secret sample URI with `sslmode=require` returns an SSL options object and emits the driver's security warning: in these versions `require`, `prefer`, and `verify-ca` are aliases for `verify-full`; the driver warns that pg 9 / pg-connection-string 3 will adopt weaker standard libpq semantics for these modes. The hosted runtime validator therefore continues to reject `uselibpqcompat`, requires TLS, and temporarily accepts `require` for the current staging-compatible behavior. Explicit `sslmode=verify-full` is the forward-compatible target. No deployed connection setting was changed. This is consistent with the [upstream node-postgres connection-string documentation](https://github.com/brianc/node-postgres/blob/master/packages/pg-connection-string/README.md), which documents current and libpq-compatible mode behavior.
## Object Storage branch-vs-snapshot restore verification

A read-only comparison now distinguishes the two Neon paths. The live staging branch exposes its `car-dealership-staging-private` (private) and `car-dealership-staging-public` (public_read) buckets. An ordinary staging child branch, `br-fragrant-hill-ao0w1gd3`, exposes the same inherited bucket definitions. The snapshot-restored drill branch, `br-empty-pond-aoikialy`, reports Object Storage enabled but returns no buckets. No object keys or contents were enumerated, copied, or changed.

Neon's [Object Storage branching description](https://neon.com/blog/building-neon-object-storage) says a normal new branch inherits its parent's buckets and objects. The live API check confirms that behavior for an ordinary child; the non-promoting snapshot restore did not include the bucket definitions. For this project's tested recovery path, database snapshot restore alone is insufficient for media/private documents. The recovery runbook must provide and test a separate object-recovery step or use a supported full-backend recovery path before P0-07 can pass.

## Fresh staging audit-log grant and snapshot-limit check (2026-11-01 16:14 UTC)

Read-only SQL against the verified staging database/branch found direct non-grantable SELECT, INSERT, UPDATE and DELETE grants on `public."AuditLog"` for `cd_staging_app`. `cd_staging_webapp` is a member of `cd_staging_app`, so it inherits those effective UPDATE/DELETE grants. Vercel environment metadata labels `DATABASE_URL` as the restricted staging app login and `DIRECT_URL` as the restricted staging webapp role; secret values were not read. The P0-07 verifier correctly requires runtime UPDATE/DELETE to be denied.

Source review found only audit-row INSERT/SELECT operations in application/runtime paths. The sole `prisma.auditLog.deleteMany` is in the synthetic seed, which refuses `APP_ENV` other than local/test and refuses production. Hosted account provisioning only inserts an audit row. The staging-only remediation proposed in Issue #6 is therefore `REVOKE UPDATE, DELETE ON TABLE public."AuditLog" FROM "cd_staging_app";`. **No grants were changed**; explicit owner approval is pending. After approval, verify SELECT/INSERT remain allowed and UPDATE/DELETE are denied for both the app role and inherited webapp role. Do not change demo grants until independently verified and separately authorized.

Read-only role metadata also shows `cd_staging_runtime` and `cd_staging_owner` are non-superuser LOGIN roles with CREATEROLE, CREATEDB and BYPASSRLS. Their operational purpose and credential custody have not been confirmed; neither role was included in the Vercel environment metadata inspected. No role attributes were changed.

A fresh snapshot list showed only `snap-wandering-tooth-ao72wvwl`, created at `2026-11-01 03:25:31 UTC`; the automatic schedule remains empty. Creating another pre-recovery snapshot was rejected by Neon with HTTP 422 `snapshots limit exceeded`. The existing snapshot remains untouched and was approximately 12h49m old at the check, so it is not a current pre-mutation checkpoint. No plan or billing change was made. The snapshot limit and absent storage restoration remain open recovery blockers.

## No-compute pre-recovery branch copy (2026-11-01 16:25 UTC)

Because Neon refused another manual snapshot at the existing snapshot limit, a no-compute child branch was created from staging as a current pre-recovery checkpoint: `p006-pre-recovery-copy-2026-11-01` (`br-summer-moon-aon9y6co`). Provider metadata reports `ready`, parent staging `br-snowy-union-aoz83v84`, parent LSN `0/1F1F710` at `2026-11-01T16:23:05Z`, `primary=false`, `default=false`, and zero compute time/CPU. A read-only bucket listing confirms both inherited bucket definitions and their access levels match staging. No database query was run on this no-compute branch, and no object keys/content were listed; therefore this is a current database branch fork with bucket definitions confirmed, not a completed restore/object-content verification or timed recovery drill. The existing manual snapshot was not removed. The fork is retained for the pre-recovery window and reviewed cleanup remains separately authorized.

## Staging append-only AuditLog grant applied (2026-11-01 16:29 UTC)

After explicit owner approval in this conversation, the exact staging-only statement was applied using `cd_staging_owner` on branch `br-snowy-union-aoz83v84`, database `car_dealership_staging`, fingerprint `e0a5faff-8c8a-4955-b70e-f5c1c17c38eb`:

```sql
REVOKE UPDATE, DELETE ON TABLE public."AuditLog" FROM "cd_staging_app";
```

A post-change read-only query verified both `cd_staging_app` and its inherited member `cd_staging_webapp`: SELECT=true, INSERT=true, UPDATE=false, DELETE=false. It also confirmed the staging identity row is unchanged and `cd_staging_webapp` still inherits `cd_staging_app`. No demo database, other role attributes, application data, or storage objects were changed. This satisfies the staging AuditLog append-only privilege check; the other P0-07 recovery and security gates remain open.
