# P11 — Workshop job cards

## Implemented

- Added a dedicated WORKSHOP role limited to workshop job cards, with Operations/Admin supervision.
- Added showroom- and assignment-scoped job cards for sold vehicles, service/repair/diagnostic job types, versioned checklist items, and audited state transitions.
- Require intake, diagnosis, work and safety checklist completion before closing the order. Active job cards are unique per vehicle.
- Added private admin APIs and a responsive workshop workspace.

## Explicit limits

- Workshop records contain no customer contact details or free-text customer notes.
- Parts reservation/use, labor costing, invoicing, warranties, service-provider integrations, customer portal access, and external communications are later phases.
- Migration and database testing are limited to isolated CI/preview. No staging or production database was changed.
