# P17: showroom operations analytics

The admin Analytics view reports status counts for sales deals created in the last 30 days and current delivery, workshop, and after-sales work. Staff counts are restricted to active showroom assignments; Admin and Super Admin retain the existing organization-wide scope.

The view deliberately excludes customer identifiers, vehicle details, invoice values, payment information, exports, and campaign results. It uses existing tables and does not add a migration or an external analytics service.

Validation runs in the CI loopback PostgreSQL database. The integration coverage checks activity in an assigned showroom and zero results for an Operations user with no showroom assignment.
