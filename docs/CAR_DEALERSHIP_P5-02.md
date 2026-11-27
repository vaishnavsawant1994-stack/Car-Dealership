# P5-02 — Indicative sales price worksheets

**Status:** Internal development feature, stacked on P5-01. Not a legal invoice, contract, vehicle reservation or payment request.

## Implemented

- Canonical SalesQuoteDraft table attaches internal quote snapshots to an existing Inquiry, Vehicle and staff User. A one-way, private snapshot preserves the listed vehicle price, discount, estimated other fees and subtotal as integer INR amounts.
- Creation is allowed only for an accessible open enquiry tied to a currently published, AVAILABLE, INR-priced vehicle.
- Server-side strict Zod validation and integer math reject negative fees, excessive discounts, malformed amounts and unrecognized business action fields.
- Internal draft route at /admin/enquiries/[id]/quotes and GET/POST /api/admin/enquiries/[id]/quotes. The POST requires enquiry.update; GET requires enquiry.view.
- Draft calculation occurs in an isolated Serializable transaction, with an audit event recording the actor, enquiry and vehicle ID without copying customer phone, email or notes into the audit metadata.
- Stored drafts are not modified if a vehicle's listing price changes later. A new worksheet must be prepared instead.
- Up to 50 recent drafts are listed for an enquiry. There is no print/send/sign/approve/payment/finance/tax API, auto-reservation or external message delivery.
- Tests cover calculation, API permission denial, rejected extra fields, unavailable vehicles, isolated DB fixture creation, immutable pricing snapshots and audit linkage.

## Explicit exclusions and launch requirements

- Subtotal excludes statutory taxes, transfer/RTO charges, insurance premiums, financing and any legally required dealer fees.
- Quotes must not be externally delivered, represented as final offers or treated as invoices until review/approval logic, taxes, versioning, customer identity, payment, cancellations and retention are separately implemented.
- The existing Vehicle reservation/sale lifecycle must remain separately authorized and cannot be driven by quote creation alone.
- Cross-branch/tenant authorization is blocked until P1-05 acceptance. No live staging migration or commercial activity has been performed.
