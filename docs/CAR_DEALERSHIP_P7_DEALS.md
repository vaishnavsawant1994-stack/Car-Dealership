# P7 — Internal sales deal lifecycle

**Status:** Draft implementation on `codex/p7-deal-lifecycle`, stacked on the Phase 1–5 integration PR. Exact-head CI and review are pending. No hosted database or deployment has been changed.

## Included

- Open a showroom- and assignment-scoped internal deal from a current quote worksheet on an eligible enquiry.
- One open, negotiating, or won deal per enquiry; unique quote linkage and optimistic version checks prevent duplicate or stale updates.
- Explicit open/negotiation/won/lost/cancelled transitions with coded acceptance evidence or loss reasons and append-only event/audit records.
- Staff-only deal board and controls, with source enquiry, vehicle, quote, and transition history.
- Every query and mutation applies the P1-05 showroom and assignment scope in the database predicate.

## Boundaries

- A won deal means staff recorded a customer acceptance method for pipeline tracking. It is not a verified contract, invoice, payment, vehicle reservation, or delivery.
- This phase does not mutate vehicle publication or status and does not message customers.
- Financial amounts remain attached to the immutable internal indicative quote worksheet; finance, tax, payment, refunds, and delivery require later phases.
- No customer freeform note is copied into the deal event history.

## Acceptance

- [ ] Exact-head CI migrations, isolated database tests, lint, typecheck, and build
- [ ] Review transition and showroom isolation behavior
- [ ] Protected preview browser acceptance after P1–P5 dependency is reviewed
