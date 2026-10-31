import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto'

export type CapturedEmailContent = {
  to: string
  subject: string
  html: string
  previewUrl?: string
}

export type SealedEmail = { encryptedPayload: string; nonce: string; authTag: string; recipientHash: string }

/** Keys are unique per environment and kept only in the deployment secret store. */
export function readCaptureKey(encoded: string | undefined): Buffer {
  if (!encoded || !/^[A-Za-z0-9_-]{43}$/.test(encoded)) throw new Error('EMAIL_CAPTURE_KEY must be a unique 32-byte base64url secret.')
  const key = Buffer.from(encoded, 'base64url')
  if (key.length !== 32 || key.toString('base64url') !== encoded) throw new Error('EMAIL_CAPTURE_KEY format is invalid.')
  return key
}

export function sealEmail(content: CapturedEmailContent, key: Buffer, environment: string): SealedEmail {
  if (key.length !== 32 || !environment) throw new Error('Valid capture encryption key and environment required.')
  const nonce = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, nonce)
  cipher.setAAD(Buffer.from('car-dealership:' + environment))
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(content), 'utf8'), cipher.final()])
  return {
    encryptedPayload: ciphertext.toString('base64url'),
    nonce: nonce.toString('base64url'),
    authTag: cipher.getAuthTag().toString('base64url'),
    recipientHash: createHmac('sha256', key).update(content.to.trim().toLowerCase()).digest('hex'),
  }
}

export function openEmail(sealed: Pick<SealedEmail, 'encryptedPayload' | 'nonce' | 'authTag'>, key: Buffer, environment: string): CapturedEmailContent {
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(sealed.nonce, 'base64url'))
  decipher.setAAD(Buffer.from('car-dealership:' + environment))
  decipher.setAuthTag(Buffer.from(sealed.authTag, 'base64url'))
  const clear = Buffer.concat([decipher.update(Buffer.from(sealed.encryptedPayload, 'base64url')), decipher.final()])
  return JSON.parse(clear.toString('utf8')) as CapturedEmailContent
}
