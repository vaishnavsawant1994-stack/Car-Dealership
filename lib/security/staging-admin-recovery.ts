import { passwordSchema } from '@/lib/auth/password'
import { StringDecoder } from 'node:string_decoder'
import type { ReadStream, WriteStream } from 'node:tty'

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
    output.write('New staging admin password (input hidden): ')
    input.setRawMode(true)
    input.on('data', onData)
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
