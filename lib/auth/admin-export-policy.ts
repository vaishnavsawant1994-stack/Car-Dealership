import { UserRole } from '@prisma/client'
import { hasPermission, type AdminPermission } from '@/lib/auth/admin-permissions'

export const exportResources = [
  'vehicles',
  'enquiries',
  'test-drives',
  'sell-requests',
  'contact-inquiries',
  'newsletter',
] as const

export type ExportResource = (typeof exportResources)[number]

const readPermission: Record<ExportResource, AdminPermission> = {
  vehicles: 'vehicle.view',
  enquiries: 'enquiry.view',
  'test-drives': 'testDrive.view',
  'sell-requests': 'sellRequest.view',
  'contact-inquiries': 'contactInquiry.view',
  newsletter: 'newsletter.view',
}

export function canExportResource(role: UserRole, resource: ExportResource): boolean {
  const exportPermission = resource === 'newsletter' ? 'newsletter.export' : 'export.create'
  return hasPermission(role, exportPermission) && hasPermission(role, readPermission[resource])
}
