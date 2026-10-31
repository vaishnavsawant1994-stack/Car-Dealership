import { randomBytes } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { openEmail, readCaptureKey, sealEmail } from './capture-crypto'

describe('encrypted demonstration email capture', () => {
  const key = readCaptureKey(randomBytes(32).toString('base64url'))
  const sample = { to: 'customer.one@car-dealership.test', subject: 'Verification', html: '<p>secret token</p>', previewUrl: 'https://demo.example.test/verify-email?token=private' }
  it('round trips ciphertext without leaving recipient or token in plaintext', () => {
    const sealed = sealEmail(sample, key, 'demo')
    expect(sealed.encryptedPayload).not.toContain('private')
    expect(sealed.encryptedPayload).not.toContain(sample.to)
    expect(sealed.nonce).toHaveLength(16)
    expect(openEmail(sealed, key, 'demo')).toEqual(sample)
  })
  it('denies another environment or key, including altered data', () => {
    const sealed = sealEmail(sample, key, 'demo')
    expect(() => openEmail(sealed, key, 'staging')).toThrow()
    expect(() => openEmail(sealed, randomBytes(32), 'demo')).toThrow()
    expect(() => openEmail({ ...sealed, encryptedPayload: sealed.encryptedPayload.slice(1) }, key, 'demo')).toThrow()
  })
  it('requires a 256-bit base64url key', () => {
    expect(() => readCaptureKey(undefined)).toThrow()
    expect(() => readCaptureKey('short')).toThrow()
    expect(() => readCaptureKey(Buffer.alloc(16).toString('base64url'))).toThrow()
  })
})
