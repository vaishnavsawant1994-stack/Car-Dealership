import { UserRole } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import { canAccessAssignedResource, canAssignResource, canManageUser, mayViewPrivateDocuments } from './admin-resource-policy'

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
})
