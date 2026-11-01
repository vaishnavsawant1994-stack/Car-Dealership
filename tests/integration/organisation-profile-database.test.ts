import 'dotenv/config'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { prisma } from '@/lib/db/prisma'
import {
  getOrganisationProfile, OrganisationProfileConflict, updateOrganisationProfile,
} from '@/lib/admin/organisation-service'

const keys = ['business_registration_number', 'business_tax_identifier'] as const
let actorId = ''
const auditedIds: string[] = []

beforeAll(async () => {
  // The tests only use the CI's independent local database. Never execute
  // this suite against hosted staging/demo or another project's database.
  if (process.env.APP_ENV !== 'test' || !process.env.DATABASE_URL?.includes('/car_dealership_test')) {
    throw new Error('P1-02 database test requires the isolated CI test database.')
  }
  const previous = await prisma.siteSetting.findMany({ where: { key: { in: [...keys] } } })
  if (previous.length) throw new Error('P1-02 test keys must be absent before the test.')
  const actor = await prisma.user.findFirstOrThrow({ where: { role: 'SUPER_ADMIN' }, select: { id: true } })
  actorId = actor.id
})

afterAll(async () => {
  // All records created by this suite are synthetic and local to CI.
  if (auditedIds.length) await prisma.auditLog.deleteMany({ where: { id: { in: auditedIds } } })
  await prisma.siteSetting.deleteMany({ where: { key: { in: [...keys] } } })
  await prisma.$disconnect()
})

describe('P1-02 organisation business profile persistence', () => {
  it('creates versioned fields atomically and records an audit event without exposing values', async () => {
    const initial = await getOrganisationProfile()
    expect(initial.settings.business_registration_number.version).toBe(0)
    const profile = await updateOrganisationProfile(actorId, [
      { key: 'business_registration_number', value: 'TEST-REG-0001', version: 0 },
      { key: 'business_tax_identifier', value: 'TEST-TAX-0001', version: 0 },
    ])
    expect(profile.settings.business_registration_number.value).toBe('TEST-REG-0001')
    expect(profile.settings.business_tax_identifier.version).toBe(1)
    const audit = await prisma.auditLog.findFirstOrThrow({
      where: { actorId, action: 'ORGANISATION_PROFILE_UPDATED' },
      orderBy: { createdAt: 'desc' },
    })
    auditedIds.push(audit.id)
    expect(JSON.stringify(audit.metadata)).toContain('business_registration_number')
    expect(JSON.stringify(audit.metadata)).not.toContain('TEST-REG-0001')
  })

  it('stores new administrative settings under the existing General category', async () => {
    const row = await prisma.siteSetting.findUniqueOrThrow({ where: { key: 'business_registration_number' } })
    expect(row.category).toBe('general')
  })

  it('rolls back the first update when a second value is stale', async () => {
    await expect(updateOrganisationProfile(actorId, [
      { key: 'business_registration_number', value: 'MUST-ROLLBACK', version: 1 },
      { key: 'business_tax_identifier', value: 'CANNOT-OVERWRITE', version: 99 },
    ])).rejects.toBeInstanceOf(OrganisationProfileConflict)
    const current = await getOrganisationProfile()
    expect(current.settings.business_registration_number.value).toBe('TEST-REG-0001')
    expect(current.settings.business_tax_identifier.value).toBe('TEST-TAX-0001')
    expect(current.settings.business_registration_number.version).toBe(1)
  })

  it('saves only matching versions and increments version', async () => {
    const updated = await updateOrganisationProfile(actorId, [
      { key: 'business_registration_number', value: 'TEST-REG-0002', version: 1 },
    ])
    expect(updated.settings.business_registration_number).toEqual({ value: 'TEST-REG-0002', version: 2 })
    const audit = await prisma.auditLog.findFirstOrThrow({
      where: { actorId, action: 'ORGANISATION_PROFILE_UPDATED' },
      orderBy: { createdAt: 'desc' },
    })
    auditedIds.push(audit.id)
    await expect(updateOrganisationProfile(actorId, [
      { key: 'business_registration_number', value: 'STALE', version: 1 },
    ])).rejects.toBeInstanceOf(OrganisationProfileConflict)
  })
})
