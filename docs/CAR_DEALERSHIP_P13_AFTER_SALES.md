# P13 after-sales care

P13 adds internal, showroom-scoped follow-up tasks after a delivery has been handed over. Operations staff can schedule first-service, warranty check-in, document confirmation, and customer feedback tasks, then mark them complete with version checking and audit history.

Task records contain no message body, phone number, email address, or customer identity. The screen shows the delivered vehicle and handover reference only. No customer messaging or marketing is triggered. Duplicate tasks of the same type and due time for one handover are rejected.

The migration and integration coverage are intended for disposable PostgreSQL in repository CI. Do not apply the migration to existing staging or production without database identity validation, backup, and acceptance.
