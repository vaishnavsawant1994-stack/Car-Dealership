# P14 customer purchase portal

P14 adds a read-only purchase status page to the existing authenticated account area. It shows only sales deals whose source inquiry is explicitly linked to the signed-in, active, verified customer account. The view contains a vehicle identifier, deal status, handover status, and a coarse after-sales follow-up state.

The query does not return finance worksheets, internal checklists, staff notes, other customer data, or contact details. Portal access is limited to customer-role accounts and no outbound messages are sent.

No database migration is required. The integration test links synthetic purchases to one test account and checks another account cannot see them. Repository CI uses disposable PostgreSQL.
