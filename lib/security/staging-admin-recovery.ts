import { passwordSchema } from '@/lib/auth/password'

export const STAGING_ADMIN_EMAIL = 'demo.admin@car-dealership.test'

type RecoveryInputs = {
  environment?: string
  projectId?: string
  approved?: string
  email?: string
  password?: string
  expectedDatabaseId?: string
  directUrl?: string
}

/** A deliberately narrow offline maintenance command, never a public API. */
export function assertStagingAdminRecovery(inputs: RecoveryInputs) {
  if (inputs.environment !== 'staging' || inputs.projectId !== 'car-dealership') {
    throw new Error('Staging-only Car-Dealership identity required.')
  }
  if (inputs.approved !== 'true' || inputs.email !== STAGING_ADMIN_EMAIL) {
    throw new Error('Explicit approval for the exact fictional staging administrator is required.')
  }
  if (!inputs.expectedDatabaseId || !inputs.directUrl) {
    throw new Error('Expected database fingerprint and maintenance connection are required.')
  }
  if (!inputs.password || inputs.password.length < 20 || !passwordSchema.safeParse(inputs.password).success) {
    throw new Error('A new, unique 20+ character password meeting the password policy is required.')
  }
}
