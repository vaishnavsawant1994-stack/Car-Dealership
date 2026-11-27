# P5-01 — Read-only sales opportunity overview

Development feature for dealership staff, not a completed commercial sales/deal/payment workflow.

## Included

- Private /admin/sales page and GET /api/admin/sales/opportunities with the existing enquiry.view and testDrive.view permissions, both required.
- One combined board for canonical Inquiry and TestDrive records, grouped into display-only New, Engaged, Scheduled, Completed, Closed and Lost stages.
- Exact mapping for every current InquiryStatus and TestDriveStatus value; not a parallel sales-status database or a claim of a closed deal.
- Accessible account assignment scoping: sales roles see unassigned or their own records; managers can see all, with exact assignment filter support.
- Stage totals aggregate the full accessible dataset in each source. The list shows at most the 100 newest matching records, selected from the 100 newest records in each source.
- Minimal field selection: reference, vehicle, status, priority, assigned staff and timestamps. Contact phone/email and private lead messages are not returned by this overview.
- Links take authorized staff to existing enquiry and test-drive workflows, which retain their own server-side permissions.
- No database migration, automatic message, invoice, quote, contract, reservation or payment transaction.

## Follow-up requirements

- Full deal/opportunity records require review of quotation versions, approvals, discounts, holds, financing, taxes, delivery, legal ownership and cancellation policy.
- Inventory reservation and sale transitions must be coordinated transactionally to prevent competing offers or double sale.
- Stage/assignment privacy is not multi-tenant isolation. Integrate P1-05 branch and negative showroom/tenant ownership tests before a production CRM.
- Keep external messages/payments disabled and staging protected until the complete release acceptance gates are met.
