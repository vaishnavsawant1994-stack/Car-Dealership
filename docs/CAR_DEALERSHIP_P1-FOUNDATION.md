# Phase 1 — Car-Dealership Core Foundation: Parallel Development Plan

**2026-11-01 | STATUS: IMPLEMENTATION PREPARATION ONLY**

P0-06 remains open; P0-07 is under review; P0-08 release acceptance is blocked. The user requested forward progress, so P1 can be designed and developed on independent feature branches. **Do not deploy P1 into the protected staging or demo environment until required release gates pass.**

## Design and architecture baseline to reuse

This repo already has a Next.js App Router, TypeScript, Prisma/PostgreSQL, NextAuth credential login, role permissions, validation, public website, admin dashboard, staff directory, showrooms, catalogue settings, content revisions, notifications, audit events, encrypted demo-email capture and seeded fictional CRM examples.

Reuse the existing design tokens, layout, routes, API conventions and schema. Do not duplicate `User`, `Showroom`, `AdminNotification`, `SiteSetting`, `AuditLog`, `Vehicle` or the existing roles.

## P1 execution slices and existing implementation references

| Work package | Existing reference | Next required work |
| --- | --- | --- |
| P1-01 Core dashboard & navigation | `app/admin/page.tsx`, `app/admin/layout.tsx` | Establish unified navigation/status and empty/loading/error acceptance contracts |
| P1-02 Organisation & business profile | `Showroom`, `SiteSetting` | Document dealer identity, location, branch association and future org boundaries without cloning settings |
| P1-03 Branch/showroom management | `app/admin/showrooms` | Review branch ownership, staff association, role scoping and address/source provenance |
| P1-04 Staff directory & account lifecycle | `app/admin/users`, `User`, `StaffInvitation` | Reuse existing onboarding/disable/session revocation and add missing permission regression coverage |
| P1-05 Roles and access matrix | `lib/auth/admin-permissions.ts`, `require-permission.ts` | Build explicit route-to-permission inventory, resource/branch scope contracts and negative tests |
| P1-06 Unified operational settings | `app/admin/settings`, `SiteSetting` | Classify safe public vs staff-only vs secret config; retain optimistic concurrency/version checks |
| P1-07 Notifications & action items | `app/admin/notifications`, `AdminNotification` | Verify notification lifecycle and deep links with role filtering |
| P1-08 Audit and activity timeline | `app/admin/audit-logs`, `AuditLog` | Enforce append-only privileges before relying on audit completeness |
| P1-09 Reference catalog & shared validation | Brand, BodyType, Feature, reference counters | Formalize shared validation, time/currency format, status transitions and reusable lookups |
| P1-10 Foundation integration contracts | `/api` routes, storage adapters, capture-only messaging | Read-only contract checks; no external integrations enabled in test demos |

## Shared foundational rules

1. Keep one canonical customer/vehicle/staff source of truth. Add relational tables only when existing entities cannot safely represent the requirement.
2. Validate authorization server-side on every route, including resource/assignment and eventual branch boundaries.
3. Keep customer-visible and internal staff messages separate; never leak private documents or identity/token data.
4. Treat audit records as append-only, and verify authorized writes without runtime UPDATE/DELETE.
5. Preserve migration history and run isolated CI DB tests; no automatic migrations in deployment builds.
6. Use fictional data in tests and demos, and maintain capture-only communications until approved.
7. Deliver desktop and mobile layouts in the current design system; no wholesale visual redesign.
8. Keep release commits on reviewed PRs with exact-head lint/typecheck/test evidence.

## P1 first execution package

**P1-01 — Core Foundation Audit and Contract Coverage** is the first safe development package. It inventories existing routes/entities/permissions and adds unit/API contract tests before adding or redesigning UI. Implement only missing functionality after identifying current behavior. Run tests on ephemeral CI databases; no live database mutation.

### Acceptance for P1-01

- A route/module ownership map for existing ten foundation work packages.
- Zero duplicated schema concepts.
- Role-permission and resource-boundary test cases mapped to real routes.
- Test status captured on the exact P1 feature-branch SHA.
- No deployment or user-facing production activation during incomplete Phase 0.

## Later approved roadmap (high level)

P2 Vehicle & Procurement; P3 Inspection; P4 CRM; P5 Sales & Deals; P6 Finance & Insurance; P7 Billing & Accounting; P8 Documents & Delivery; P9 Workshop; P10 Parts; P11 After-sales/My Garage; P12 Marketing & Communications; P13 Analytics & AI; P14 Multi-branch; P15 SaaS; P16 Industry Extensions. Avoid implementing these in P1 or duplicating existing capabilities.
