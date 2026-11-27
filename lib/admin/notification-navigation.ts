import { UserRole } from '@prisma/client'
import { hasPermission, type AdminPermission } from '@/lib/auth/admin-permissions'

type Destination = { route: string; permission: AdminPermission }
const destinations: Record<string, Destination> = {
  Inquiry: { route: '/admin/enquiries', permission: 'enquiry.view' },
  TestDrive: { route: '/admin/test-drives', permission: 'testDrive.view' },
  SellRequest: { route: '/admin/sell-requests', permission: 'sellRequest.view' },
  ContactMessage: { route: '/admin/contact-inquiries', permission: 'contactInquiry.view' },
  Vehicle: { route: '/admin/vehicles', permission: 'vehicle.view' },
}

/**
 * Route construction is an ergonomic layer, not resource authorization.
 * Destination pages enforce their own server-side permission and ownership checks.
 * Unknown types, disallowed roles and unsafe identifiers never become links.
 */
export function notificationDestination(
  role: UserRole,
  resourceType: string | null,
  resourceId: string | null,
): string | null {
  if (!resourceType || !resourceId) return null
  const target = destinations[resourceType]
  if (!target || !hasPermission(role, target.permission)) return null
  if (!/^[a-zA-Z0-9_-]{1,120}$/.test(resourceId)) return null
  return `${target.route}/${encodeURIComponent(resourceId)}`
}
