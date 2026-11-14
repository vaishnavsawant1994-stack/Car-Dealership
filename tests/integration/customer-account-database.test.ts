import 'dotenv/config'
import { afterAll, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { UserStatus } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'

describe('seeded customer account data', () => {
  afterAll(async () => prisma.$disconnect())

  it('contains verified and pending development identities', async () => {
    const verified = await prisma.user.findUniqueOrThrow({ where: { email: 'customer@deccanwheels.local' } })
    const pending = await prisma.user.findUniqueOrThrow({ where: { email: 'pending@deccanwheels.local' } })
    expect(verified.status).toBe(UserStatus.ACTIVE)
    expect(verified.emailVerified).toBeInstanceOf(Date)
    expect(verified.passwordHash).toMatch(/^\$argon2id\$/)
    expect(pending.status).toBe(UserStatus.PENDING_VERIFICATION)
    expect(pending.emailVerified).toBeNull()
  })

  it('seeds owned favourites and trackable customer requests', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'customer@deccanwheels.local' } })
    const [favorites, inquiry, drive, sellRequest, settings] = await Promise.all([
      prisma.favorite.count({ where: { userId: user.id } }),
      prisma.inquiry.findFirst({ where: { userId: user.id, referenceNumber: 'OA-ENQ-DEMO-000001' } }),
      prisma.testDrive.findFirst({ where: { userId: user.id, referenceNumber: 'OA-TD-DEMO-000001' } }),
      prisma.sellRequest.findFirst({ where: { userId: user.id, referenceNumber: 'OA-SELL-DEMO-000001' } }),
      prisma.customerNotificationSettings.findUnique({ where: { userId: user.id } }),
    ])
    expect(favorites).toBeGreaterThanOrEqual(3)
    expect(inquiry?.status).toBe('CONTACTED')
    expect(drive?.status).toBe('CONFIRMED')
    expect(sellRequest?.status).toBe('CONTACTED')
    expect(settings?.testDriveReminders).toBe(true)
  })

  it('keeps guest submissions unowned and customer references unique', async () => {
    const guestInquiry = await prisma.inquiry.findFirst({ where: { userId: null } })
    const guestDrive = await prisma.testDrive.findFirst({ where: { userId: null } })
    expect(guestInquiry?.referenceNumber).toMatch(/^OA-ENQ-LEGACY-/)
    expect(guestDrive?.referenceNumber).toMatch(/^OA-TD-LEGACY-/)
    const references = await prisma.inquiry.findMany({ select: { referenceNumber: true } })
    expect(new Set(references.map((item) => item.referenceNumber)).size).toBe(references.length)
  })
})
