# P15 customer consent and privacy

P15 hardens the existing privacy controls. Only an active, verified customer account can update its own communication preferences. The server now records channel-specific before/after consent states in the same transaction as the settings update. Promotional consent timestamps are retained as evidence when a customer withdraws; every subsequent choice is recorded in the audit log.

Marketing email and WhatsApp choices remain off by default. The account page states that campaign delivery is disabled. No marketing messages are sent or queued by these controls. Staff can suppress a customer’s consent but cannot grant it on the customer’s behalf.

Data-rights intake remains a separate manual review workflow with identity verification; it does not automatically export or erase customer data. The integration test uses isolated PostgreSQL and checks customer-only updates, audit evidence, withdrawal, and retained consent history.
