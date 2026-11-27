import 'dotenv/config'
import { afterAll, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { UserRole } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { parseCustomerFilters } from '@/lib/crm/customer-query'
import { getCustomer360, listCustomers } from '@/lib/crm/customer-service'

afterAll(async () => prisma.$disconnect())

describe('P4-01 isolated PostgreSQL customer 360 read models', () => {
  it('lists registered customers only, excluding staff and deleted accounts', async () => {
    if (process.env.APP_ENV !== 'test' || !process.env.DATABASE_URL?.includes('/car_dealership_test')) {
      throw new Error('Customer CRM integration tests only run against the isolated CI test database.')
    }
    const data = await listCustomers(parseCustomerFilters({ page: '1' }))
    expect(data.pagination.pageSize).toBe(20)
    expect(data.data.every((item) => item.status && item.id)).toBe(true)
    const rows = await prisma.user.findMany({
      where: { id: { in: data.data.map((item) => item.id) } },
      select: { role: true, deletedAt: true },
    })
    expect(rows.every((row) => row.role === UserRole.CUSTOMER && row.deletedAt === null)).toBe(true)
    expect(JSON.stringify(data)).not.toContain('passwordHash')
    expect(JSON.stringify(data)).not.toContain('sessionVersion')
  })

  it('reads explicit customer-bound relationships without joining unrelated guest enquiries', async () => {
    const user = await prisma.user.findFirstOrThrow({
      where: { role: UserRole.CUSTOMER, deletedAt: null }, select: { id: true },
    })
    const data = await getCustomer360(user.id)
    expect(data?.customer.id).toBe(user.id)
    const counts = await Promise.all([
      prisma.inquiry.count({ where: { userId: user.id } }),
      prisma.testDrive.count({ where: { userId: user.id } }),
      prisma.sellRequest.count({ where: { userId: user.id } }),
      prisma.favorite.count({ where: { userId: user.id } }),
    ])
    expect(data?.customer._count).toMatchObject({
      inquiries: counts[0], testDrives: counts[1], sellRequests: counts[2], favorites: counts[3],
    })
    expect(data?.inquiries.every((item) => item.referenceNumber)).toBe(true)
    expect(JSON.stringify(data)).not.toContain('passwordHash')
    expect(JSON.stringify(data)).not.toContain('encryptedPayload')
  })

  it('does not return staff accounts or nonexistent customer IDs as a customer profile', async () => {
    const staff = await prisma.user.findFirstOrThrow({ where: { role: UserRole.ADMIN }, select: { id: true } })
    expect(await getCustomer360(staff.id)).toBeNull()
    expect(await getCustomer360('invalid-nonexistent-customer')).toBeNull()
  })
})
