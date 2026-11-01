import 'server-only'

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { getCarDealershipEnvironment } from '@/lib/config/isolation'
import {
  mapOrganisationSettings, organisationKeys, validateOrganisationChanges,
  type OrganisationChange,
} from './organisation-profile'

export class OrganisationProfileConflict extends Error {
  constructor() { super('The organisation profile has changed. Reload and try again.') }
}

export class OrganisationProfileValidationError extends Error {
  constructor(public readonly fields: Record<string, string>) {
    super('Organisation profile has invalid field values.')
  }
}

export async function getOrganisationProfile() {
  const [settings, primaryShowroom, showroomCount] = await Promise.all([
    prisma.siteSetting.findMany({ where: { key: { in: [...organisationKeys] } }, select: { key: true, value: true, version: true } }),
    prisma.showroom.findFirst({
      where: { active: true, isPrimary: true },
      select: { id: true, name: true, address: true, city: true, state: true, country: true, phone: true, email: true, hours: true },
    }),
    prisma.showroom.count({ where: { active: true } }),
  ])
  return { settings: mapOrganisationSettings(settings), primaryShowroom, showroomCount }
}

/**
 * All-or-nothing CAS updates. version=0 means a setting does not yet exist.
 * Audit metadata records field names only and is written in the same transaction.
 */
export async function updateOrganisationProfile(actorId: string, changes: readonly OrganisationChange[]) {
  if (!actorId || changes.length === 0) throw new OrganisationProfileConflict()
  const errors = validateOrganisationChanges(changes, getCarDealershipEnvironment())
  if (Object.keys(errors).length) throw new OrganisationProfileValidationError(errors)

  try {
    await prisma.$transaction(async (tx) => {
      for (const { key, value, version } of changes) {
        if (version === 0) {
          // If another user inserted this key, the unique constraint aborts
          // the entire transaction instead of overwriting their value.
          await tx.siteSetting.create({ data: { key, value, category: 'general' } })
        } else {
          const result = await tx.siteSetting.updateMany({
            where: { key, version },
            data: { value, version: { increment: 1 } },
          })
          if (result.count !== 1) throw new OrganisationProfileConflict()
        }
      }
      await tx.auditLog.create({
        data: {
          actorId,
          action: 'ORGANISATION_PROFILE_UPDATED',
          entity: 'SiteSetting',
          resourceType: 'SiteSetting',
          summary: 'Updated the organisation business profile.',
          metadata: { keys: changes.map(({ key }) => key) },
        },
      })
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  } catch (error) {
    if (error instanceof OrganisationProfileConflict) throw error
    if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2034'].includes(error.code)) {
      throw new OrganisationProfileConflict()
    }
    throw error
  }
  return getOrganisationProfile()
}
