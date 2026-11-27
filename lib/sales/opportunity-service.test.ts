import { InquiryStatus, LeadPriority, TestDriveStatus, UserRole } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    inquiry: { findMany: vi.fn(), groupBy: vi.fn() },
    testDrive: { findMany: vi.fn(), groupBy: vi.fn() },
  },
}))

import { prisma } from '@/lib/db/prisma'
import { getSalesOpportunityBoard } from './opportunity-service'

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(prisma.inquiry.findMany).mockResolvedValue([{
    id: 'inquiry-1', referenceNumber: 'FICTIONAL-I-1', status: InquiryStatus.NEW,
    priority: LeadPriority.NORMAL, submittedAt: new Date('2026-11-20T00:00:00Z'),
    assignedTo: null, vehicle: null,
  }] as never)
  vi.mocked(prisma.testDrive.findMany).mockResolvedValue([{
    id: 'drive-1', referenceNumber: 'FICTIONAL-T-1', status: TestDriveStatus.CONFIRMED,
    priority: LeadPriority.HIGH, submittedAt: new Date('2026-11-21T00:00:00Z'),
    assignedTo: { name: 'Synthetic Sales' },
    vehicle: { shortTitle: 'Fictional Vehicle', stockNumber: 'TEST-1' },
  }] as never)
  vi.mocked(prisma.inquiry.groupBy).mockResolvedValue([{
    status: InquiryStatus.NEW, _count: { _all: 1 },
  }] as never)
  vi.mocked(prisma.testDrive.groupBy).mockResolvedValue([{
    status: TestDriveStatus.CONFIRMED, _count: { _all: 1 },
  }] as never)
})

describe('P5-01 read-only sales board query contracts', () => {
  it('applies identical staff scoping to both datasets and counts', async () => {
    const actor = { id: 'sales-1', role: UserRole.SALES }
    const result = await getSalesOpportunityBoard(actor as never, { stage: null, assignment: 'all' })
    const expectedScope = { OR: [{ assignedToId: null }, { assignedToId: 'sales-1' }] }
    for (const method of [
      prisma.inquiry.findMany, prisma.testDrive.findMany,
      prisma.inquiry.groupBy, prisma.testDrive.groupBy,
    ]) {
      expect(method).toHaveBeenCalledWith(expect.objectContaining({ where: expectedScope }))
    }
    expect(result.items.map((item) => item.referenceNumber)).toEqual(['FICTIONAL-T-1', 'FICTIONAL-I-1'])
    expect(result.stageCounts).toMatchObject({ new: 1, scheduled: 1 })
    expect(result.matchingTotal).toBe(2)
  })
  it('selects no lead email, phone, message or private customer details', async () => {
    await getSalesOpportunityBoard({ id: 'admin-1', role: UserRole.ADMIN } as never, { stage: 'new', assignment: 'all' })
    expect(prisma.inquiry.findMany).toHaveBeenCalledWith(expect.objectContaining({
      select: expect.objectContaining({ referenceNumber: true, status: true }),
    }))
    const query = vi.mocked(prisma.inquiry.findMany).mock.calls[0][0] as { select: Record<string, unknown> }
    for (const field of ['email', 'phone', 'fullName', 'message', 'user', 'consentAccepted']) {
      expect(Object.hasOwn(query.select, field)).toBe(false)
    }
    expect(JSON.stringify(query.select)).not.toContain('passwordHash')
  })
})
