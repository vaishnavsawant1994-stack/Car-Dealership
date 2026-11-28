import { UserRole } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import { accessibleResourceWhere, canAccessAssignedResource, canAccessScopedResource, canAssignResource, canManageUser, mayViewPrivateDocuments, showroomScopeWhere, inspectionShowroomWhere } from './admin-resource-policy'

const actor = (id: string, role: UserRole) => ({ id, role })
const assignedResource = (assignedToId: string | null) => ({ assignedToId })

describe('admin resource access boundaries', () => {
  it.each([UserRole.SALES, UserRole.OPERATIONS, UserRole.CONTENT_MANAGER])('%s sees unassigned and own assigned records only', (role) => {
    const current = actor('staff-a', role)
    expect(canAccessAssignedResource(current, assignedResource(null))).toBe(true)
    expect(canAccessAssignedResource(current, assignedResource('staff-a'))).toBe(true)
    expect(canAccessAssignedResource(current, assignedResource('staff-b'))).toBe(false)
  })

  it.each([UserRole.ADMIN, UserRole.SUPER_ADMIN])('%s can access records across staff queues', (role) => {
    const current = actor('staff-a', role)
    expect(canAccessAssignedResource(current, assignedResource(null))).toBe(true)
    expect(canAccessAssignedResource(current, assignedResource('staff-b'))).toBe(true)
  })

  it.each([UserRole.SALES, UserRole.OPERATIONS, UserRole.CONTENT_MANAGER])('%s can assign only to self or leave the queue unassigned', (role) => {
    const current = actor('staff-a', role)
    expect(canAssignResource(current, null)).toBe(true)
    expect(canAssignResource(current, 'staff-a')).toBe(true)
    expect(canAssignResource(current, 'staff-b')).toBe(false)
  })

  it.each([UserRole.ADMIN, UserRole.SUPER_ADMIN])('%s can assign records to another staff member', (role) => {
    expect(canAssignResource(actor('staff-a', role), 'staff-b')).toBe(true)
  })

  it('protects Super Admin accounts from ordinary administrators', () => {
    expect(canManageUser(actor('admin-a', UserRole.ADMIN), { id: 'root', role: UserRole.SUPER_ADMIN })).toBe(false)
    expect(canManageUser(actor('admin-a', UserRole.ADMIN), { id: 'staff-b', role: UserRole.SALES })).toBe(true)
    expect(canManageUser(actor('root', UserRole.SUPER_ADMIN), { id: 'staff-b', role: UserRole.SALES })).toBe(true)
    expect(canManageUser(actor('root', UserRole.SUPER_ADMIN), { id: 'root', role: UserRole.SUPER_ADMIN })).toBe(false)
    expect(canManageUser(actor('staff-a', UserRole.SALES), { id: 'staff-b', role: UserRole.SALES })).toBe(false)
  })

  it('limits private customer documents to operational and administrator roles', () => {
    expect(mayViewPrivateDocuments(UserRole.CUSTOMER)).toBe(false)
    expect(mayViewPrivateDocuments(UserRole.SALES)).toBe(false)
    expect(mayViewPrivateDocuments(UserRole.CONTENT_MANAGER)).toBe(false)
    expect(mayViewPrivateDocuments(UserRole.OPERATIONS)).toBe(true)
    expect(mayViewPrivateDocuments(UserRole.ADMIN)).toBe(true)
    expect(mayViewPrivateDocuments(UserRole.SUPER_ADMIN)).toBe(true)
  })

  it('requires an active assigned showroom as well as assignment access for focused roles', () => {
    const current = actor('staff-a', UserRole.SALES)
    const scope = { global: false as const, showroomIds: ['showroom-a'] }
    expect(canAccessScopedResource(current, { assignedToId: null, showroomId: 'showroom-a' }, scope)).toBe(true)
    expect(canAccessScopedResource(current, { assignedToId: 'staff-b', showroomId: 'showroom-a' }, scope)).toBe(false)
    expect(canAccessScopedResource(current, { assignedToId: 'staff-a', showroomId: 'showroom-b' }, scope)).toBe(false)
    expect(canAccessScopedResource(current, { assignedToId: null, showroomId: null }, scope)).toBe(false)
    expect(showroomScopeWhere(scope)).toEqual({ showroomId: { in: ['showroom-a'] } })
  })

  it.each([UserRole.SALES, UserRole.OPERATIONS, UserRole.CONTENT_MANAGER])('%s database mutations retain showroom and assignment predicates', (role) => {
    const current = actor('staff-a', role)
    const scope = { global: false as const, showroomIds: ['showroom-a', 'showroom-b'] }
    expect(accessibleResourceWhere(current, scope)).toEqual({
      showroomId: { in: ['showroom-a', 'showroom-b'] },
      OR: [{ assignedToId: null }, { assignedToId: 'staff-a' }],
    })
  })

  it('allows the organization-wide administrator scope and does not constrain it to assignments', () => {
    const current = actor('admin-a', UserRole.ADMIN)
    const scope = { global: true as const, showroomIds: [] }
    expect(canAccessScopedResource(current, { assignedToId: null, showroomId: 'other-showroom' }, scope)).toBe(true)
    expect(showroomScopeWhere(scope)).toEqual({})
    expect(accessibleResourceWhere(current, scope)).toEqual({})
  })

  it('scopes inspection child records through their parent vehicle', () => {
    expect(inspectionShowroomWhere({ global: false, showroomIds: ['showroom-a'] })).toEqual({
      vehicle: { is: { showroomId: { in: ['showroom-a'] } } },
    })
    expect(inspectionShowroomWhere({ global: false, showroomIds: [] })).toEqual({
      vehicle: { is: { showroomId: { in: [] } } },
    })
    expect(inspectionShowroomWhere({ global: true, showroomIds: [] })).toEqual({})
  })
})

