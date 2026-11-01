import 'dotenv/config'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { UserRole, UserStatus } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { hashPassword } from '@/lib/auth/password'
import {
  changeStaffLifecycle, listStaffInvitations, revokeStaffInvitation,
  revokeStaffSessions,
} from '@/lib/admin/staff-lifecycle-service'

let superId = ''
let adminId = ''
let staffId = ''
let unverifiedId = ''
let showroomId = ''
const invitationIds: string[] = []
const prefix = 'p104-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)

const superActor = () => ({ id: superId, role: UserRole.SUPER_ADMIN })
const adminActor = () => ({ id: adminId, role: UserRole.ADMIN })

beforeAll(async () => {
  const database = new URL(process.env.DATABASE_URL ?? 'postgresql://invalid/invalid')
  if (process.env.APP_ENV !== 'test' ||
    !['localhost', '127.0.0.1'].includes(database.hostname) ||
    database.pathname !== '/car_dealership_test') {
    throw new Error('P1-04 tests are only authorized against the isolated CI PostgreSQL database.')
  }
  const [superAdmin, admin] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { email: 'superadmin@deccanwheels.local' } }),
    prisma.user.findUniqueOrThrow({ where: { email: 'admin@deccanwheels.local' } }),
  ])
  superId = superAdmin.id
  adminId = admin.id
  const passwordHash = await hashPassword('FictionalP104!Pass2026')
  const staff = await prisma.user.create({
    data: { email: prefix + '-staff@car-dealership.test', name: 'Fictional P1 Staff',
      role: UserRole.SALES, status: UserStatus.ACTIVE, emailVerified: new Date(),
      passwordHash, adminPreferences: { create: {} } },
  })
  staffId = staff.id
  const unverified = await prisma.user.create({
    data: { email: prefix + '-unverified@car-dealership.test',
      role: UserRole.OPERATIONS, status: UserStatus.DISABLED,
      emailVerified: null, passwordHash: null } })
  unverifiedId = unverified.id
  const showroom = await prisma.showroom.create({ data: {
    name: 'Fictional P104 Test Branch', address: 'Fictional Test Road, 1',
    city: 'Pune', state: 'Maharashtra', postalCode: '411057', country: 'India',
    phone: 'Demo enquiries only', email: 'demo.sales@car-dealership.test',
    hours: '10:00 - 18:00', active: true, isPrimary: false,
  } })
  showroomId = showroom.id
  await prisma.showroomStaffAssignment.create({ data: { userId: staffId, showroomId } })
  await prisma.session.create({ data: {
    userId: staffId, sessionToken: prefix + '-test-session',
    expires: new Date(Date.now() + 60_000),
  } })
})

afterAll(async () => {
  if (invitationIds.length) {
    await prisma.auditLog.deleteMany({ where: { resourceType: 'StaffInvitation',
      resourceId: { in: invitationIds } } })
    await prisma.staffInvitation.deleteMany({ where: { id: { in: invitationIds } } })
  }
  if (staffId && unverifiedId) {
    await prisma.auditLog.deleteMany({ where: { OR: [
      { resourceType: 'User', resourceId: { in: [staffId, unverifiedId] } },
      { actorId: { in: [staffId, unverifiedId] } },
    ] } })
    await prisma.showroomStaffAssignment.deleteMany({ where: { userId: { in: [staffId, unverifiedId] } } })
    await prisma.session.deleteMany({ where: { userId: { in: [staffId, unverifiedId] } } })
    await prisma.user.deleteMany({ where: { id: { in: [staffId, unverifiedId] } } })
  }
  if (showroomId) await prisma.showroom.delete({ where: { id: showroomId } })
  await prisma.$disconnect()
})

describe('P1-04 real PostgreSQL staff lifecycle', () => {
  it('atomically changes staff role, increments version, revokes stored/JWT sessions and keeps eligible branch membership', async () => {
    const first = await prisma.user.findUniqueOrThrow({ where: { id: staffId } })
    const edited = await changeStaffLifecycle(superActor(), staffId, {
      role: UserRole.OPERATIONS, version: first.sessionVersion,
    })
    expect(edited.role).toBe(UserRole.OPERATIONS)
    expect(edited.sessionVersion).toBe(first.sessionVersion + 1)
    expect(await prisma.session.count({ where: { userId: staffId } })).toBe(0)
    expect(await prisma.showroomStaffAssignment.count({ where: { userId: staffId } })).toBe(1)
    expect(await prisma.auditLog.count({ where: { action: 'USER_ROLE_CHANGED', entityId: staffId } })).toBe(1)
    await expect(changeStaffLifecycle(superActor(), staffId, {
      role: UserRole.SALES, version: first.sessionVersion,
    })).rejects.toMatchObject({ code: 'EDIT_CONFLICT' })
    expect(await prisma.auditLog.count({
      where: { action: 'USER_ROLE_CHANGED', entityId: staffId },
    })).toBe(1)
  })

  it('denies role escalation from an ordinary admin and forbids customer-account editing', async () => {
    const staff = await prisma.user.findUniqueOrThrow({ where: { id: staffId } })
    await expect(changeStaffLifecycle(adminActor(), staffId, {
      role: UserRole.ADMIN, version: staff.sessionVersion,
    })).rejects.toMatchObject({ code: 'FORBIDDEN' })
    const customer = await prisma.user.findUniqueOrThrow({ where: { email: 'customer@deccanwheels.local' } })
    await expect(changeStaffLifecycle(superActor(), customer.id, {
      status: UserStatus.DISABLED, version: customer.sessionVersion,
    })).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('cannot re-enable a passwordless unverified disabled fixture', async () => {
    const fixture = await prisma.user.findUniqueOrThrow({ where: { id: unverifiedId } })
    await expect(changeStaffLifecycle(superActor(), unverifiedId, {
      status: UserStatus.ACTIVE, version: fixture.sessionVersion,
    })).rejects.toMatchObject({ code: 'PROVISIONING_REQUIRED' })
  })

  it('suspends staff and removes their operational showroom membership in the same transaction', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: staffId } })
    const edited = await changeStaffLifecycle(superActor(), staffId, {
      status: UserStatus.SUSPENDED, version: user.sessionVersion,
    })
    expect(edited.status).toBe(UserStatus.SUSPENDED)
    expect(edited.sessionVersion).toBe(user.sessionVersion + 1)
    expect(await prisma.showroomStaffAssignment.count({ where: { userId: staffId } })).toBe(0)
    const audit = await prisma.auditLog.findFirstOrThrow({
      where: { action: 'USER_STATUS_CHANGED', entityId: staffId },
      orderBy: { createdAt: 'desc' },
    })
    expect(audit.metadata).toMatchObject({ removedShowroomAssignments: 1, sessionsRevoked: true })
  })

  it('reactivates only verified, credentialed local staff and revokes session generations', async () => {
    const previous = await prisma.user.findUniqueOrThrow({ where: { id: staffId } })
    const active = await changeStaffLifecycle(superActor(), staffId, {
      status: UserStatus.ACTIVE, version: previous.sessionVersion,
    })
    expect(active.status).toBe(UserStatus.ACTIVE)
    expect(active.sessionVersion).toBe(previous.sessionVersion + 1)
    expect(await prisma.showroomStaffAssignment.count({ where: { userId: staffId } })).toBe(0)
  })

  it('blocks protected administrator session revocation while permitting authorized staff revocation', async () => {
    await expect(revokeStaffSessions(adminActor(), superId)).rejects.toMatchObject({ code: 'FORBIDDEN' })
    const previous = await prisma.user.findUniqueOrThrow({ where: { id: staffId } })
    const result = await revokeStaffSessions(adminActor(), staffId)
    expect(result.revoked).toBe(true)
    const current = await prisma.user.findUniqueOrThrow({ where: { id: staffId } })
    expect(current.sessionVersion).toBe(previous.sessionVersion + 1)
  })

  it('revokes invitations without exposing token hashes or changing unrelated accounts', async () => {
    const invitation = await prisma.staffInvitation.create({ data: {
      email: prefix + '-invite@car-dealership.test', role: UserRole.SALES,
      tokenHash: prefix + '-opaque-token-hash', invitedById: superId,
      expiresAt: new Date(Date.now() + 48 * 60 * 60_000),
    } })
    invitationIds.push(invitation.id)
    const adminInvitation = await prisma.staffInvitation.create({ data: {
      email: prefix + '-admininvite@car-dealership.test', role: UserRole.ADMIN,
      tokenHash: prefix + '-admin-hash', invitedById: superId,
      expiresAt: new Date(Date.now() + 48 * 60 * 60_000),
    } })
    invitationIds.push(adminInvitation.id)
    const visible = await listStaffInvitations(UserRole.ADMIN)
    expect(visible.some((item) => item.id === invitation.id)).toBe(true)
    expect(visible.some((item) => item.id === adminInvitation.id)).toBe(false)
    expect(JSON.stringify(visible)).not.toContain('tokenHash')
    await expect(revokeStaffInvitation(adminActor(), adminInvitation.id))
      .rejects.toMatchObject({ code: 'FORBIDDEN' })
    expect((await revokeStaffInvitation(adminActor(), invitation.id, 'Role reassignment')).revoked).toBe(true)
    await expect(revokeStaffInvitation(adminActor(), invitation.id))
      .rejects.toMatchObject({ code: 'INVITATION_UNAVAILABLE' })
    expect(await prisma.auditLog.count({ where: {
      action: 'STAFF_INVITATION_REVOKED', resourceId: invitation.id,
    } })).toBe(1)
  })
})
