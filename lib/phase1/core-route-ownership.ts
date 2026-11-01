import type { AdminPermission } from '@/lib/auth/admin-permissions'

/** P1-01 inventory of existing routes, not new authorization logic. */
export type CoreApiMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'
export type FoundationRouteOwnership = {
  packageId: string
  module: string
  page: string
  api: string
  methods: readonly { method: CoreApiMethod; permission: AdminPermission }[]
}
export const coreFoundationRoutes = [
  { packageId: 'P1-01', module: 'Core dashboard and profile', page: 'app/admin/page.tsx', api: 'app/api/admin/profile/route.ts',
    methods: [{ method: 'GET', permission: 'dashboard.view' }, { method: 'PATCH', permission: 'dashboard.view' }] },
  { packageId: 'P1-03', module: 'Showrooms list', page: 'app/admin/showrooms/page.tsx', api: 'app/api/admin/showrooms/route.ts',
    methods: [{ method: 'GET', permission: 'showroom.manage' }, { method: 'POST', permission: 'showroom.manage' }] },
  { packageId: 'P1-03', module: 'Showroom details', page: 'app/admin/showrooms/page.tsx', api: 'app/api/admin/showrooms/[id]/route.ts',
    methods: [{ method: 'GET', permission: 'showroom.manage' }, { method: 'PATCH', permission: 'showroom.manage' }] },
  { packageId: 'P1-04', module: 'Staff directory', page: 'app/admin/users/page.tsx', api: 'app/api/admin/users/route.ts',
    methods: [{ method: 'GET', permission: 'user.view' }, { method: 'POST', permission: 'user.invite' }] },
  { packageId: 'P1-04', module: 'Staff details', page: 'app/admin/users/page.tsx', api: 'app/api/admin/users/[id]/route.ts',
    methods: [{ method: 'GET', permission: 'user.view' }, { method: 'PATCH', permission: 'user.update' }] },
  { packageId: 'P1-05', module: 'Session revocation', page: 'app/admin/users/page.tsx', api: 'app/api/admin/users/[id]/revoke-sessions/route.ts',
    methods: [{ method: 'POST', permission: 'session.revoke' }] },
  { packageId: 'P1-06', module: 'System settings', page: 'app/admin/settings/page.tsx', api: 'app/api/admin/settings/[key]/route.ts',
    methods: [{ method: 'PATCH', permission: 'settings.update' }] },
  { packageId: 'P1-07', module: 'Notifications', page: 'app/admin/notifications/page.tsx', api: 'app/api/admin/notifications/route.ts',
    methods: [{ method: 'GET', permission: 'notification.view' }, { method: 'PATCH', permission: 'notification.view' }] },
  { packageId: 'P1-07', module: 'Notification acknowledgment', page: 'app/admin/notifications/page.tsx', api: 'app/api/admin/notifications/[id]/route.ts',
    methods: [{ method: 'PATCH', permission: 'notification.view' }] },
  { packageId: 'P1-08', module: 'Audit log', page: 'app/admin/audit-logs/page.tsx', api: 'app/api/admin/audit-logs/route.ts',
    methods: [{ method: 'GET', permission: 'auditLog.view' }] },
  { packageId: 'P1-05', module: 'Staff password change', page: 'app/admin/profile/page.tsx', api: 'app/api/admin/profile/password/route.ts',
    methods: [{ method: 'POST', permission: 'dashboard.view' }] },
  { packageId: 'P1-10', module: 'Captured email metadata', page: 'app/admin/page.tsx', api: 'app/api/admin/email-captures/route.ts',
    methods: [{ method: 'GET', permission: 'emailCapture.view' }] },
] as const satisfies readonly FoundationRouteOwnership[]
