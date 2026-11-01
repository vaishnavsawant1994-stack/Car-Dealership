import 'dotenv/config'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { prisma } from '@/lib/db/prisma'
import {
  assignShowroomStaff, createShowroom, editShowroom, getShowroomStaff,
  myActiveShowrooms, removeShowroomStaff,
} from '@/lib/admin/showroom-service'

const ids: string[] = []
let actorId = ''
let salesId = ''
let operationsId = ''
let customerId = ''
let branchId = ''
let otherBranchId = ''

const showroomData = (name: string) => ({
  name, address: 'Fictional test lane', city: 'Pune', state: 'Maharashtra',
  postalCode: '411057', country: 'India', phone: 'Demo enquiries only',
  email: 'demo.sales@car-dealership.test', hours: '10 AM - 6 PM',
  whatsapp: '', mapUrl: '', latitude: null, longitude: null,
  active: true, isPrimary: false,
})

beforeAll(async () => {
  const target = new URL(process.env.DATABASE_URL ?? 'postgresql://invalid/invalid')
  if (process.env.APP_ENV !== 'test' || target.hostname !== 'localhost' ||
    target.pathname !== '/car_dealership_test') {
    throw new Error('P1-03 integration tests only run against the isolated local CI PostgreSQL database.')
  }
  const [actor, sales, operations, customer] = await Promise.all([
    prisma.user.findFirstOrThrow({ where: { email: 'superadmin@deccanwheels.local' }, select: { id: true } }),
    prisma.user.findFirstOrThrow({ where: { email: 'sales@deccanwheels.local' }, select: { id: true } }),
    prisma.user.findFirstOrThrow({ where: { email: 'operations@deccanwheels.local' }, select: { id: true } }),
    prisma.user.findFirstOrThrow({ where: { email: 'customer@deccanwheels.local' }, select: { id: true } }),
  ])
  actorId = actor.id
  salesId = sales.id
  operationsId = operations.id
  customerId = customer.id
})

afterAll(async () => {
  if (ids.length) {
    await prisma.showroomStaffAssignment.deleteMany({ where: { showroomId: { in: ids } } })
    await prisma.auditLog.deleteMany({ where: { resourceType: 'Showroom', resourceId: { in: ids } } })
    await prisma.showroom.deleteMany({ where: { id: { in: ids } } })
  }
  await prisma.$disconnect()
})

describe('P1-03 branch and showroom lifecycle in isolated PostgreSQL', () => {
  it('creates two independent showrooms, with a version and audit trail', async () => {
    const first = await createShowroom(actorId, showroomData('P103 Fictional North'))
    const second = await createShowroom(actorId, showroomData('P103 Fictional South'))
    branchId = first.id; otherBranchId = second.id; ids.push(first.id, second.id)
    expect(first.version).toBe(1)
    expect(second.active).toBe(true)
    expect(second.isPrimary).toBe(false)
    expect(await prisma.auditLog.count({
      where: { action: 'SHOWROOM_CREATED', entityId: { in: ids } },
    })).toBe(2)
  })

  it('assigns eligible staff, enforces unique pairs, and prevents customers and super admins', async () => {
    const assignment = await assignShowroomStaff(actorId, branchId, salesId)
    expect(assignment.showroomId).toBe(branchId)
    expect(assignment.userId).toBe(salesId)
    await expect(assignShowroomStaff(actorId, branchId, salesId)).rejects.toMatchObject({ code: 'EDIT_CONFLICT' })
    await expect(assignShowroomStaff(actorId, branchId, customerId)).rejects.toMatchObject({ code: 'STAFF_INELIGIBLE' })
    await expect(assignShowroomStaff(actorId, branchId, actorId)).rejects.toMatchObject({ code: 'STAFF_INELIGIBLE' })
    await assignShowroomStaff(actorId, otherBranchId, operationsId)
    const list = await getShowroomStaff(branchId)
    expect(list.assignments.map(a => a.userId)).toEqual([salesId])
    expect(list.candidates.every(u => u.role !== 'CUSTOMER' && u.role !== 'SUPER_ADMIN')).toBe(true)
  })

  it('scopes staff self-service to assigned active branches only', async () => {
    const sales = await myActiveShowrooms(salesId)
    expect(sales.some(({ showroom }) => showroom.id === branchId)).toBe(true)
    expect(sales.some(({ showroom }) => showroom.id === otherBranchId)).toBe(false)
    const operations = await myActiveShowrooms(operationsId)
    expect(operations.some(({ showroom }) => showroom.id === otherBranchId)).toBe(true)
    expect(operations.some(({ showroom }) => showroom.id === branchId)).toBe(false)
    expect(await myActiveShowrooms(customerId)).toEqual([])
  })

  it('rejects deactivation with assignments and rejects stale version updates atomically', async () => {
    const original = await prisma.showroom.findUniqueOrThrow({ where: { id: branchId } })
    await expect(editShowroom(actorId, branchId, {
      ...showroomData('P103 Fictional North'), active: false, version: original.version,
    })).rejects.toMatchObject({ code: 'STAFF_ASSIGNED' })
    await expect(editShowroom(actorId, branchId, {
      ...showroomData('Stale update'), version: 10000,
    })).rejects.toMatchObject({ code: 'EDIT_CONFLICT' })
    const current = await prisma.showroom.findUniqueOrThrow({ where: { id: branchId } })
    expect(current.active).toBe(true)
    expect(current.name).toBe(original.name)
    expect(current.version).toBe(original.version)
  })

  it('permits a versioned update, prevents stale resubmission and audits only successful writes', async () => {
    const before = await prisma.showroom.findUniqueOrThrow({ where: { id: branchId } })
    const changed = await editShowroom(actorId, branchId, {
      ...showroomData('P103 Fictional North Branch'), version: before.version,
    })
    expect(changed.version).toBe(before.version + 1)
    expect(changed.name).toBe('P103 Fictional North Branch')
    await expect(editShowroom(actorId, branchId, {
      ...showroomData('Overwriting stale'), version: before.version,
    })).rejects.toMatchObject({ code: 'EDIT_CONFLICT' })
    expect(await prisma.auditLog.count({
      where: { action: 'SHOWROOM_UPDATED', entityId: branchId },
    })).toBe(1)
  })

  it('removes assignments, then permits deactivation, and stops staff self-service visibility', async () => {
    await removeShowroomStaff(actorId, branchId, salesId)
    await expect(removeShowroomStaff(actorId, branchId, salesId)).rejects.toMatchObject({ code: 'ASSIGNMENT_NOT_FOUND' })
    expect((await myActiveShowrooms(salesId)).some(({ showroom }) => showroom.id === branchId)).toBe(false)
    const current = await prisma.showroom.findUniqueOrThrow({ where: { id: branchId } })
    const updated = await editShowroom(actorId, branchId, {
      ...showroomData('P103 Fictional North Branch'), active: false, version: current.version,
    })
    expect(updated.active).toBe(false)
    await expect(assignShowroomStaff(actorId, branchId, salesId)).rejects.toMatchObject({ code: 'BRANCH_INACTIVE' })
    expect(await prisma.auditLog.count({
      where: { action: 'SHOWROOM_STAFF_REMOVED', entityId: branchId },
    })).toBe(1)
  })
})
