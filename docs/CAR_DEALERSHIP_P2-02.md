# P2-02 — Procurement Inspection Readiness

**Status:** Development on a PR stacked on P2-01; no deployment, customer messaging, legal checks, or live database mutations.

## Implemented

- `/admin/procurement/inspections`: read-only inspection readiness queue, restricted to staff with `sellRequest.inspect`.
- `GET /api/admin/procurement/inspections`: permissioned, private/no-store API with optional `attention=true` filtering.
- A bounded scan of the newest 100 accessible Sell Requests in existing inspection lifecycle statuses. Both API and page explicitly explain this limit; no global count is claimed.
- The display maps canonical `SellInspection` evidence, checking exterior/interior/mechanical/overall scores (1–10) and documents verification. Service history is an advisory. If completion timestamps and evidence disagree, the queue highlights that mismatch.
- Read-only access to the current `SellRequest` and `SellInspection` models, selecting only minimal operational fields. No private seller attachments, internal notes, personal contact details or financial fields are selected.
- Links back to the existing sell request workflow, where any modification still requires its own server-side authorization.
- Status evidence tests verify complete, missing, inconsistent and not-yet-finalized cases, plus assignment scoping.

## Next work

P2-03: controlled procurement intake conversion/identity and document requirements, designed after P1-05 resource-boundary integration. P2-02 is evidence visibility, not a new inspection write engine or full legal acquisition.

Remain on isolated feature branches until integration review. The owner chose to keep the repository public; historical credential exposure response and secure Super Admin login remain release acceptance items. Do not weaken or misrepresent these controls.
