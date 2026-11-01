import type { CarDealershipEnvironment } from './isolation'

type Hosted = Extract<CarDealershipEnvironment, 'staging' | 'demo'>

export type IdentityRow = { application: string; environment: string; instanceId: string }
export type AppRoleRow = {
  role: string
  canLogin: boolean
  isSuperuser: boolean
  canCreateRoles: boolean
  canCreateDatabases: boolean
  inheritsRoles: boolean
  memberships: number
  canCreateSchema: boolean
  canWriteIdentity: boolean
  canWriteMigrations: boolean
  canReadVehicles: boolean
}

export function assertHostedIdentity(row: IdentityRow | undefined, environment: Hosted, expectedId: string | undefined) {
  if (!expectedId || !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(expectedId)) {
    throw new Error('An approved environment fingerprint is mandatory.')
  }
  if (!row || row.application !== 'car-dealership' ||
      row.environment !== environment || row.instanceId.toLowerCase() !== expectedId.toLowerCase()) {
    throw new Error('Database fingerprint or environment mismatch.')
  }
}

export function assertRestrictedAppRole(row: AppRoleRow | undefined, environment: Hosted) {
  const expectedName = environment === 'staging' ? 'cd_staging_app' : 'cd_demo_app'
  if (!row || row.role !== expectedName || !row.canLogin ||
      row.isSuperuser || row.canCreateRoles || row.canCreateDatabases ||
      row.inheritsRoles || row.memberships !== 0 ||
      row.canCreateSchema || row.canWriteIdentity || row.canWriteMigrations ||
      !row.canReadVehicles) {
    throw new Error('Database runtime role failed least-privilege verification.')
  }
}
