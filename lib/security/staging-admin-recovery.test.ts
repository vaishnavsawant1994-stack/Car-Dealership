import { EventEmitter } from 'node:events'
import type { ReadStream, WriteStream } from 'node:tty'
import { describe, expect, it, vi } from 'vitest'
import { assertStagingAdminRecovery, readMaskedStagingAdminPassword, STAGING_ADMIN_EMAIL } from './staging-admin-recovery'

const approved = {
  environment: 'staging',
  projectId: 'car-dealership',
  approved: 'true',
  email: STAGING_ADMIN_EMAIL,
  password: 'SyntheticOnlySecure!2026-Stage',
  directUrl: 'postgresql://test@localhost/car_dealership_staging',
  expectedDatabaseId: 'synthetic-fixture-identity',
}

describe('P0-06 staging-only password recovery preflight', () => {
  it('allows only a fully approved staging admin recovery request', () => {
    expect(() => assertStagingAdminRecovery(approved)).not.toThrow()
  })
  it.each([
    { environment: 'demo' },
    { environment: 'commercial' },
    { environment: 'test' },
    { projectId: 'other-project' },
    { approved: 'false' },
    { email: 'demo.manager@car-dealership.test' },
    { email: 'customer@example.com' },
    { password: 'short' },
    { password: 'alllowercaseandnothingelse' },
    { password: '' },
    { expectedDatabaseId: '' },
    { directUrl: '' },
  ])('fails closed for invalid input %o', (invalid) => {
    expect(() => assertStagingAdminRecovery({ ...approved, ...invalid })).toThrow()
  })
})

describe('masked password input', () => {
  function fakeTTY(isTTY = true) {
    const input = new EventEmitter() as EventEmitter & Partial<ReadStream>
    Object.assign(input, {
      isTTY,
      isRaw: false,
      setRawMode: vi.fn(function (this: { isRaw: boolean }, mode: boolean) { this.isRaw = mode; return this }),
      resume: vi.fn(),
    })
    const output = { isTTY, write: vi.fn() }
    return { input: input as ReadStream, output: output as unknown as WriteStream }
  }

  it('accepts a hidden interactive secret and restores terminal mode', async () => {
    const { input, output } = fakeTTY()
    const passwordPromise = readMaskedStagingAdminPassword(input, output)
    input.emit('data', Buffer.from('SyntheticOnlySecure!2026-Stage\r'))
    await expect(passwordPromise).resolves.toBe('SyntheticOnlySecure!2026-Stage')
    expect(output.write).toHaveBeenCalledWith('New staging admin password (input hidden): ')
    expect(output.write).toHaveBeenCalledWith('\n')
    expect(input.setRawMode).toHaveBeenNthCalledWith(1, true)
    expect(input.setRawMode).toHaveBeenNthCalledWith(2, false)
  })

  it('refuses non-interactive input', async () => {
    const { input, output } = fakeTTY(false)
    await expect(readMaskedStagingAdminPassword(input, output)).rejects.toThrow('private interactive TTY')
  })

  it('cancels without exposing input and restores terminal mode', async () => {
    const { input, output } = fakeTTY()
    const passwordPromise = readMaskedStagingAdminPassword(input, output)
    input.emit('data', Buffer.from('partial-secret\u0003'))
    await expect(passwordPromise).rejects.toThrow('cancelled')
    expect(output.write).toHaveBeenCalledTimes(2)
    expect(input.setRawMode).toHaveBeenNthCalledWith(1, true)
    expect(input.setRawMode).toHaveBeenNthCalledWith(2, false)
  })
})
