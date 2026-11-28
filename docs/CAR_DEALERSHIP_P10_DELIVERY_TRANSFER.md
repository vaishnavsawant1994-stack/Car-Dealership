# P10 — Delivery and transfer preparation

## Implemented

- Added a showroom/assignment-scoped delivery case for a won deal with an internal finance worksheet. Opening it reserves the available vehicle with an optimistic status/version update.
- Added checklist items for offline cleared-funds verification, customer document review, vehicle preparation, insurance documents, and RC transfer documents.
- Restricted cleared-funds verification to Finance/Admin and require a different staff member to move the case to ready for handover.
- Recorded a customer handover acknowledgement as an explicit staff attestation before marking the vehicle sold and unpublished. Vehicle status history and audit logs are written in the same transaction.
- Added cancellation that releases a reserved vehicle only before cleared funds have been verified.

## Explicit limits

- This application does not process or capture money. Finance staff must verify cleared funds outside the application; this is an audited staff attestation, not a payment-provider result.
- The app does not issue a legal/tax invoice, store private identity documents, submit RC/ownership-transfer paperwork, contact customers, or integrate with government/provider services.
- Handover requires all checklist items, second-person settlement verification, and an explicit customer acknowledgement. CI is the only database validation target until a protected preview is separately approved.
