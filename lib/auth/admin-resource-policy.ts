import { UserRole } from '@prisma/client'
import type { Prisma } from '@prisma/client'
import type { AdminActor } from '@/lib/auth/require-admin'

type AssignableResource = { assignedToId: string | null }

export type ShowroomScope = { global: true; showroomIds: string[] } | { global: false; showroomIds: string[] }

export function canAccessScopedResource(
  actor: Pick<AdminActor, 'id' | 'role'>,
  resource: AssignableResource & { showroomId: string | null },
  scope: ShowroomScope,
): boolean {
  if (scope.global) return true
  if (!resource.showroomId || !scope.showroomIds.includes(resource.showroomId)) return false
  return canAccessAssignedResource(actor, resource)
}

export function showroomScopeWhere(scope: ShowroomScope): { showroomId?: { in: string[] } } {
  return scope.global ? {} : { showroomId: { in: [...scope.showroomIds] } }
}

/** Scopes inspection rows through their parent vehicle before any child data is read. */
export function inspectionShowroomWhere(scope: ShowroomScope): Prisma.VehicleInspectionWhereInput {
  return scope.global ? {} : { vehicle: { is: { showroomId: { in: [...scope.showroomIds] } } } }
}

/** Database predicate for mutations that must retain both branch and queue access. */
export function accessibleResourceWhere(actor: Pick<AdminActor, 'id' | 'role'>, scope: ShowroomScope) {
  return {
    ...showroomScopeWhere(scope),
    ...(!scope.global ? { OR: [{ assignedToId: null }, { assignedToId: actor.id }] } : {}),
  }
}

export function canAccessAssignedResource(actor: Pick<AdminActor, 'id' | 'role'>, resource: AssignableResource): boolean {
  if (actor.role === UserRole.SUPER_ADMIN || actor.role === UserRole.ADMIN) return true
  return resource.assignedToId === null || resource.assignedToId === actor.id
}

export function canAssignResource(actor: Pick<AdminActor, 'id' | 'role'>, assignedToId: string | null): boolean {
  if (actor.role === UserRole.SUPER_ADMIN || actor.role === UserRole.ADMIN) return true
  return assignedToId === null || assignedToId === actor.id
}

export function canManageUser(actor: Pick<AdminActor, 'id' | 'role'>, target: { id: string; role: UserRole }): boolean {
  if (actor.id === target.id && target.role === UserRole.SUPER_ADMIN) return false
  if (target.role === UserRole.SUPER_ADMIN) return actor.role === UserRole.SUPER_ADMIN
  return actor.role === UserRole.ADMIN || actor.role === UserRole.SUPER_ADMIN
}

export function mayViewPrivateDocuments(role: UserRole): boolean {
  return role === UserRole.OPERATIONS || role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN
}

