import 'server-only'

import { UserRole } from '@prisma/client'
import type { AdminActor } from '@/lib/auth/require-admin'
import { prisma } from '@/lib/db/prisma'
import type { ShowroomScope } from './admin-resource-policy'

/** Admin is organization-wide; other staff are limited to active showroom assignments. */
export async function getActorShowroomScope(actor: Pick<AdminActor, 'id' | 'role'>): Promise<ShowroomScope> {
  if (actor.role === UserRole.ADMIN || actor.role === UserRole.SUPER_ADMIN) {
    return { global: true, showroomIds: [] }
  }

  const assignments = await prisma.showroomStaffAssignment.findMany({
    where: { userId: actor.id, showroom: { active: true } },
    select: { showroomId: true },
  })
  return { global: false, showroomIds: assignments.map(({ showroomId }) => showroomId) }
}

export async function primaryShowroomId(): Promise<string | null> {
  const showroom = await prisma.showroom.findFirst({
    where: { active: true, isPrimary: true },
    select: { id: true },
  })
  return showroom?.id ?? null
}
