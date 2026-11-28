# P12 workshop parts and inventory

P12 adds a shared parts catalog with stock tracked by showroom as an append-only movement ledger. Parts managers can create a part with opening stock, record later receipts, and issue a workshop request only when that branch has enough quantity. Workshop staff can request stock against an active, assigned job card; the request does not reduce inventory until a manager issues it.

The role matrix adds a restricted `PARTS_MANAGER` role. Workshop staff receive request access and can see only the stock and open requests within their assigned showrooms. Parts managers can receive and issue stock only in their assigned showrooms. Admin and Super Admin remain global under the existing policy.

Every receipt, request and issue is audited. Issuance uses a serializable transaction, request version check, and branch balance check. The migration and integrated lifecycle test are intended for the disposable PostgreSQL service in repository CI. Do not apply it to an existing staging or production database without separate database identity validation, backup, and acceptance.

P12 does not add supplier purchasing, customer charges, parts pricing, or external messaging.
