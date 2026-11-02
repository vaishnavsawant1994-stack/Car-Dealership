import { passwordSchema, verifyPassword } from '@/lib/auth/password'
import { StringDecoder } from 'node:string_decoder'
import type { ReadStream, WriteStream } from 'node:tty'

export const STAGING_ADMIN_EMAIL = 'demo.admin@car-dealership.test'
export const STAGING_ADMIN_RECOVERY_ROLE = 'cd_staging_app'
export const STAGING_NEON_ENDPOINT_ID = 'ep-red-king-ao2lq5tj'
export const STAGING_NEON_INSTANCE_ID = 'e0a5faff-8c8a-4955-b70e-f5c1c17c38eb'

export function assertStagingAdminRecoveryInstanceId(expectedDatabaseId?: string) {
  if (expectedDatabaseId !== STAGING_NEON_INSTANCE_ID) {
    throw new Error('Recovery is pinned to the verified staging database identity.')
  }
}

export function assertStagingAdminRecoveryConnection(connectionString: string) {
  try {
    const url = new URL(connectionString)
    const sslModes = url.searchParams.getAll('sslmode')
    if (url.protocol !== 'postgresql:' || url.hostname.split('.')[0] !== STAGING_NEON_ENDPOINT_ID ||
        decodeURIComponent(url.username) !== STAGING_ADMIN_RECOVERY_ROLE ||
        sslModes.length !== 1 || sslModes[0] !== 'verify-full' || url.searchParams.has('uselibpqcompat')) {
      throw new Error('invalid connection configuration')
    }
  } catch {
    throw new Error('Recovery requires the restricted staging app role and sslmode=verify-full.')
  }
}

export type StagingAdminRecoveryDatabaseRole = {
  roleName: string
  superuser: boolean
  createDb: boolean
  createRole: boolean
  bypassRls: boolean
  inherit: boolean
  memberships: number
  identityRead: boolean
  userRead: boolean
  userUpdate: boolean
  sessionDelete: boolean
  resetTokenUpdate: boolean
  auditInsert: boolean
  auditUpdate: boolean
  auditDelete: boolean
}

export function assertStagingAdminRecoveryDatabaseRole(role: StagingAdminRecoveryDatabaseRole) {
  if (role.roleName !== STAGING_ADMIN_RECOVERY_ROLE || role.superuser || role.createDb || role.createRole ||
      role.bypassRls || role.inherit || role.memberships !== 0 || !role.identityRead || !role.userRead ||
      !role.userUpdate || !role.sessionDelete || !role.resetTokenUpdate || !role.auditInsert ||
      role.auditUpdate || role.auditDelete) {
    throw new Error('Database role does not match the restricted staging recovery privilege profile.')
  }
}

type RecoveryInputs = {
  environment?: string
  projectId?: string
  approved?: string
  email?: string
  password?: string
  expectedDatabaseId?: string
  directUrl?: string
}

/** Read a secret only from an interactive terminal, with terminal echo disabled. */
export function readMaskedStagingAdminPassword(input: ReadStream, output: WriteStream): Promise<string> {
  if (!input.isTTY || !output.isTTY || typeof input.setRawMode !== 'function') {
    return Promise.reject(new Error('Password recovery requires a private interactive TTY.'))
  }

  return new Promise((resolve, reject) => {
    const wasRaw = input.isRaw
    const decoder = new StringDecoder('utf8')
    let value = ''
    let settled = false
    const cleanup = () => {
      input.off('data', onData)
      input.off('end', onEnd)
      input.off('error', onError)
      input.pause()
      input.setRawMode(wasRaw ?? false)
      output.write('\n')
    }
    const finish = (error?: Error) => {
      if (settled) return
      settled = true
      cleanup()
      if (error) reject(error)
      else if (value.length < 20 || !passwordSchema.safeParse(value).success) {
        value = ''
        reject(new Error('New password must be unique, 20+ characters, and meet the password policy.'))
      } else resolve(value)
    }
    const onData = (chunk: Buffer | string) => {
      const chars = typeof chunk === 'string' ? chunk : decoder.write(chunk)
      for (const char of chars) {
        if (char === '\u0003' || char === '\u0004') return finish(new Error('Password entry cancelled.'))
        if (char === '\r' || char === '\n') return finish()
        if (char === '\u007f' || char === '\b') value = value.slice(0, -1)
        else if (char >= ' ' && char !== '\u007f') value += char
      }
    }
    const onEnd = () => finish(new Error('Password entry cancelled because the private TTY closed.'))
    const onError = () => finish(new Error('Password input failed.'))
    output.write('New staging admin password (input hidden): ')
    input.setRawMode(true)
    input.on('data', onData)
    input.once('end', onEnd)
    input.once('error', onError)
    input.resume()
  })
}

/** A deliberately narrow offline maintenance command, never a public API. */
export function assertStagingAdminRecoveryApproval(inputs: Omit<RecoveryInputs, 'password'>) {
  if (inputs.environment !== 'staging' || inputs.projectId !== 'car-dealership') {
    throw new Error('Staging-only Car-Dealership identity required.')
  }
  if (inputs.approved !== 'true' || inputs.email !== STAGING_ADMIN_EMAIL) {
    throw new Error('Explicit approval for the exact fictional staging administrator is required.')
  }
  if (!inputs.expectedDatabaseId || !inputs.directUrl) {
    throw new Error('Expected database fingerprint and maintenance connection are required.')
  }
}

export function assertStagingAdminRecovery(inputs: RecoveryInputs) {
  assertStagingAdminRecoveryApproval(inputs)
  if (!inputs.password || inputs.password.length < 20 || !passwordSchema.safeParse(inputs.password).success) {
    throw new Error('A new, unique 20+ character password meeting the password policy is required.')
  }
}

/** Require an actual credential change, even if the operator re-enters the old password. */
export async function assertStagingAdminPasswordIsNew(
  newPassword: string,
  currentPasswordHash: string,
  verify: typeof verifyPassword = verifyPassword,
) {
  if (await verify(currentPasswordHash, newPassword)) {
    throw new Error('The new password must differ from the existing staging admin password.')
  }
}
