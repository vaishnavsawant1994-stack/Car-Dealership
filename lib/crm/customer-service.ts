import 'server-only'

import { UserRole } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import {
  CUSTOMER_PAGE_SIZE, customerListSelect, customerProfileSelect,
  customerWhere, type CustomerFilters,
} from './customer-query'

/** Read-only CRM. Never join anonymous enquiries by email; only explicit userId relations count. */
export async function listCustomers(filters: CustomerFilters) {
  const where = customerWhere(filters)
  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where, select: customerListSelect,
      take: CUSTOMER_PAGE_SIZE, skip: (filters.page - 1) * CUSTOMER_PAGE_SIZE,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    }),
    prisma.user.count({ where }),
  ])
  return {
    data: rows,
    pagination: { page: filters.page, pageSize: CUSTOMER_PAGE_SIZE,
      total, totalPages: Math.max(1, Math.ceil(total / CUSTOMER_PAGE_SIZE)) },
  }
}

export async function getCustomer360(id: string) {
  const customer = await prisma.user.findFirst({
    where: { id, role: UserRole.CUSTOMER, deletedAt: null },
    select: customerProfileSelect,
  })
  if (!customer) return null

  const [inquiries, testDrives, sellRequests, favorites, messages] = await Promise.all([
    prisma.inquiry.findMany({
      where: { userId: id },
      take: 30, orderBy: [{ submittedAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true, referenceNumber: true, status: true, priority: true, submittedAt: true,
        vehicle: { select: { id: true, shortTitle: true, stockNumber: true } },
      },
    }),
    prisma.testDrive.findMany({
      where: { userId: id },
      take: 30, orderBy: [{ submittedAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true, referenceNumber: true, status: true, preferredDate: true, preferredTime: true,
        confirmedDate: true, confirmedTime: true, submittedAt: true,
        vehicle: { select: { id: true, shortTitle: true, stockNumber: true } },
      },
    }),
    prisma.sellRequest.findMany({
      where: { userId: id },
      take: 30, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: { id: true, referenceNumber: true, status: true, createdAt: true,
        make: true, model: true, year: true },
    }),
    prisma.favorite.findMany({
      where: { userId: id },
      take: 30, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        createdAt: true,
        vehicle: { select: { id: true, shortTitle: true, stockNumber: true, status: true } },
      },
    }),
    prisma.customerEngagementMessage.findMany({
      where: { userId: id, customerVisible: true },
      take: 30, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true, body: true, createdAt: true, sentByCustomer: true,
        inquiryId: true, testDriveId: true,
      },
    }),
  ])
  return { customer, inquiries, testDrives, sellRequests, favorites, messages }
}
