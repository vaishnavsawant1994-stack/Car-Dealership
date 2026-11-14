# P2-01 — Vehicle Procurement Intake Workspace

**Status:** Working feature branch; no staging mutations, deployment or external integrations.

## Purpose

Provide a staff-facing acquisition overview of seller-provided vehicles without creating a second CRM, duplicating the canonical `SellRequest`, or starting a payment flow prematurely.

## Implemented

- `/admin/procurement`: responsive staff intake workspace with stage totals, assignment filters, recent intake records and links to existing seller-request detail workflows.
- `GET /api/admin/procurement`: permissioned, current-user-scoped, cache-disabled JSON summary.
- Canonical `RequestStatus` values map exhaustively to five display stages: New Intake, Inspection, Valuation & Offers, Acquisition and Closed. This mapping is **display-only**, not a separate workflow state machine.
- `sellRequest.view` must be present before the page or API is accessed. Non-admin roles may view only unassigned or their own assigned seller requests. Admin and Super Admin can view all, subject to explicit assignment filters.
- Returns only minimal seller-intake details. No email addresses, phone numbers, attached private documents, internal messages or payment records are selected by the board service.
- Filters and pages have bounded accepted values. Counts use the same assignment scope as rows, with stage-independent group totals.
- Uses the existing dark/gold admin design language and the canonical Sell Requests detail pages.
- Pure regression tests verify the complete RequestStatus inventory, role boundaries, stage filtering and invalid filter handling.

## Explicitly not yet included

- Acquisition contracts, real seller identity checks, legal title/ownership verification, seller payment or procurement accounting.
- Linking a particular seller request to new inventory requires a later independently reviewed workflow and audit policy. The existing `Vehicle` and `SellRequest` remain the only canonical records.
- Multi-branch row-level isolation remains dependent on unmerged P1-03 and locally developed P1-05; assignment scoping alone is **not** tenant isolation.
- No public onboarding, external messages, payment activation or client demo deployment.

This is Phase 2's first implementable slice. Further P2 modules require accepted product specifications, schema migrations and staged E2E testing after foundation integration.
