# P1-05 — Roles & Access Matrix (effective-permission explorer)

**Status:** Implemented as an independent GitHub feature branch. Existing, separate local VS Code/Codex P1-05 work has not been overwritten or incorporated.

## Delivered

- Read-only, server-rendered /admin/roles matrix showing the six existing Prisma roles and every permission from the centralized adminPermissions policy.
- Module grouping, effective-permission counts, role descriptions, accessible grant/deny labels, and a link to the independently guarded staff lifecycle controls.
- GET /api/admin/roles returns only derived effective-permission metadata; requires user.view server-side authorization and uses private no-store caching.
- Neither UI nor API can create roles, alter policy grants, escalate an account or modify sessions. Role assignment and activation remain controlled by P1-04 staff lifecycle and protected invitation policies.
- Tests ensure the list is exhaustive, no permission is duplicated, every role's matrix matches the authoritative hasPermission function, and only Super Admin may manage protected roles.
- No schema migration, arbitrary dynamic permission table or client-side permission override was added.

## Remaining P1-05 acceptance scope

- Staff-to-showroom associations already exist in P1-03, but **tenant-/branch-level row ownership across the complete API surface is not established merely by these assignments**.
- Before enabling multi-organization business data, reconcile the owner's local P1-05 implementation and design an independently reviewed service-level branch/organization-scoping policy. Do not publish a fictitious tenant-isolation claim.
- Verify organization isolation for vehicle, lead, procurement, customer, inspection, files and exports with negative database/API tests.
- Audit assignment status changes, invitation privileges, session revocation and Super Admin isolation in protected staging.
- Do not merge/deploy P1-05 independently of the P1 foundation dependency chain.

The current deliverable is an effective-permission management interface, not a dynamic user-editable RBAC engine or complete multi-tenant authorization certification.
