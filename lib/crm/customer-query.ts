import { Prisma, UserRole, UserStatus } from '@prisma/client'

export const CUSTOMER_PAGE_SIZE = 20

/** Query parameters are bounded and never become Prisma selection column names. */
export function parseCustomerFilters(input: { page?: string | null; search?: string | null; status?: string | null }) {
  const raw = input.page?.trim() ?? ''
  const page = /^[1-9][0-9]{0,3}$/.test(raw) ? Math.min(1000, Number(raw)) : 1
  const status = Object.values(UserStatus).includes(input.status as UserStatus)
    ? input.status as UserStatus : null
  return { page, search: (input.search ?? '').trim().slice(0, 120), status }
}

export type CustomerFilters = ReturnType<typeof parseCustomerFilters>
export function customerWhere(filters: CustomerFilters): Prisma.UserWhereInput {
  return {
    role: UserRole.CUSTOMER, deletedAt: null,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.search ? { OR: [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { email: { contains: filters.search, mode: 'insensitive' } },
      { phone: { contains: filters.search, mode: 'insensitive' } },
    ] } : {}),
  }
}

export const customerListSelect = {
  id: true, name: true, email: true, phone: true, status: true,
  createdAt: true, lastLoginAt: true,
  _count: { select: { inquiries: true, testDrives: true, sellRequests: true, favorites: true } },
} as const satisfies Prisma.UserSelect

export const customerProfileSelect = {
  id: true, name: true, email: true, phone: true, city: true,
  preferredContactMethod: true, status: true, emailVerified: true, createdAt: true, lastLoginAt: true,
  notificationSettings: { select: { marketingEmails: true, marketingConsentedAt: true } },
  _count: { select: { inquiries: true, testDrives: true, sellRequests: true, favorites: true } },
} as const satisfies Prisma.UserSelect

/** No password/session/reset token/other sensitive account fields may appear on read-only CRM surfaces. */
export function customerSafeProjection() {
  return Object.keys(customerListSelect)
}
