import { afterEach, describe, expect, it, vi } from 'vitest'
import { logSafeError } from './safe-log'

describe('logSafeError', () => {
  afterEach(() => vi.restoreAllMocks())

  it('omits raw error messages and keeps explicitly selected context', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const error = Object.assign(new Error('postgresql://operator:secret@example.test/db?token=private'), {
      name: 'PrismaClientKnownRequestError',
    })

    logSafeError('database_operation_failed', error, { recordId: 'synthetic-record-id' })

    expect(log).toHaveBeenCalledWith('database_operation_failed', {
      recordId: 'synthetic-record-id',
      errorType: 'PrismaClientKnownRequestError',
    })
    expect(JSON.stringify(log.mock.calls)).not.toContain('secret')
    expect(JSON.stringify(log.mock.calls)).not.toContain('private')
  })

  it('uses a safe fallback for invalid error names and non-Error values', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const error = Object.assign(new Error('sensitive'), { name: 'db://user:secret' })

    logSafeError('request_failed', error)
    logSafeError('request_failed', { message: 'secret' })

    expect(log).toHaveBeenNthCalledWith(1, 'request_failed', { errorType: 'UnknownError' })
    expect(log).toHaveBeenNthCalledWith(2, 'request_failed', { errorType: 'UnknownError' })
  })
})
