# P8 — Finance review and invoice drafts

## Implemented

- Added a finance-only staff role with `finance.view` and `finance.update`. It is showroom/assignment scoped and has no sales, customer, inventory, payment, or configuration permissions.
- Added an internal worksheet created only from a won deal. It snapshots the indicative INR quote and vehicle reference and permits one draft per deal.
- Added server-side amount consistency checks and database constraints, optimistic version field, private no-store read APIs, and audit logging.
- Added the finance review page for eligible deals and existing draft worksheets.
- Finance reads and invoice creation require the deal and its linked vehicle to belong to the staff member's active showroom; isolated database coverage includes a mismatched legacy deal with an existing invoice.

## Explicit limits

- The record is an internal worksheet, not a legal, GST, or tax invoice. It has no tax calculation, buyer address, invoice issuance, delivery state, payment request, capture, refund, or external communication.
- Staff must complete tax treatment, customer identity verification, regulatory review, approval, and retention rules before any actual invoice or payment feature is enabled.
- The migration must run only in isolated CI/preview after environment confirmation. Staging and production were not changed.
