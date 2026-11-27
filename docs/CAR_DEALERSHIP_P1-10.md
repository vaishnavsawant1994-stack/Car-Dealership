# P1-10 — Foundation Integration Contracts

This package validates integration boundaries through the **existing** auth, database isolation, messaging, email capture and audit utilities. It does not add a competing user/vehicle schema, duplicate permission system or external provider integration.

## Covered negative contracts

1. Hosted staging/demo/preview environments reject real-domain identities and public customer self-registration.
2. Only the explicitly approved Car-Dealership database name and host are accepted for isolated staging; legacy/localhost/other-environment targets are rejected.
3. Staff role permissions deny unauthorized publication and role management; non-admin assignments and protected user accounts remain scoped.
4. Public WhatsApp call-to-action helpers remain on the internal contact route until commercial authorization.
5. Captured-email records use environment-bound AES-GCM authentication; incorrect environment, key or authentication tag fails decryption; plaintext recipient information is not serialized in the sealed record.
6. Audit metadata sanitization removes secret-bearing keys recursively, including arrays.

All tests run without external network calls or real customer data. This is *unit/integration-contract coverage*, not live staging authentication, database IAM, or storage penetration testing. Full end-to-end P0 acceptance and staff-to-branch resource isolation remain tracked separately.

### Delivery

- Add `lib/foundation/p1-integration-contracts.test.ts`.
- Validate on exact PR head with standard lint, TypeScript, isolated test suite, and production build.
- Do not merge, deploy or activate external messaging before normal project review.
