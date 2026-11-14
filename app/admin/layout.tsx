import type { ReactNode } from 'react'
import { hasPermission, type AdminPermission } from '@/lib/auth/admin-permissions'
import { requireAdmin } from '@/lib/auth/require-admin'
import { prisma } from '@/lib/db/prisma'
import { AdminShell, type AdminNavItem } from '@/components/admin/AdminShell'
import './admin.css'

const groups: Array<{ label: string; items: Array<AdminNavItem & { permission: AdminPermission }> }> = [
  { label: 'Overview', items: [{ label: 'Dashboard', href: '/admin', icon: 'dashboard', permission: 'dashboard.view' }] },
  { label: 'Inventory', items: [
    { label: 'Vehicles', href: '/admin/vehicles', icon: 'vehicles', permission: 'vehicle.view' },
    { label: 'Brands', href: '/admin/brands', icon: 'brands', permission: 'brand.manage' },
    { label: 'Body Types', href: '/admin/body-types', icon: 'bodyTypes', permission: 'bodyType.manage' },
    { label: 'Features', href: '/admin/features', icon: 'features', permission: 'feature.manage' },
  ] },
  { label: 'Customer Operations', items: [
    { label: 'Enquiries', href: '/admin/enquiries', icon: 'enquiries', permission: 'enquiry.view' },
    { label: 'Test Drives', href: '/admin/test-drives', icon: 'testDrives', permission: 'testDrive.view' },
    { label: 'Sell Requests', href: '/admin/sell-requests', icon: 'sellRequests', permission: 'sellRequest.view' },
    { label: 'Contact Messages', href: '/admin/contact-inquiries', icon: 'contacts', permission: 'contactInquiry.view' },
  ] },
  { label: 'Content', items: [
    { label: 'Testimonials', href: '/admin/testimonials', icon: 'testimonials', permission: 'testimonial.manage' },
    { label: 'Gallery', href: '/admin/gallery', icon: 'gallery', permission: 'gallery.manage' },
    { label: 'Website Content', href: '/admin/content', icon: 'content', permission: 'content.manage' },
    { label: 'Newsletter', href: '/admin/newsletter', icon: 'newsletter', permission: 'newsletter.view' },
  ] },
  { label: 'Management', items: [
    { label: 'Organisation', href: '/admin/organisation', icon: 'organisation', permission: 'settings.view' },
    { label: 'Showrooms', href: '/admin/showrooms', icon: 'showrooms', permission: 'showroom.manage' },
    { label: 'Users & Roles', href: '/admin/users', icon: 'users', permission: 'user.view' },
    { label: 'Settings', href: '/admin/settings', icon: 'settings', permission: 'settings.view' },
    { label: 'Audit Logs', href: '/admin/audit-logs', icon: 'audit', permission: 'auditLog.view' },
  ] },
]

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const actor = await requireAdmin('/admin')
  let unread = 0
  try { unread = await prisma.adminNotification.count({ where: { userId: actor.id, readAt: null } }) } catch {}
  const navGroups = groups.map((group) => ({ label: group.label, items: group.items.filter((item) => hasPermission(actor.role, item.permission)).map(({ permission: _, ...item }) => item) })).filter((group) => group.items.length)
  return <AdminShell navGroups={navGroups} name={actor.name ?? actor.email} role={actor.role} unread={unread}>{children}</AdminShell>
}
