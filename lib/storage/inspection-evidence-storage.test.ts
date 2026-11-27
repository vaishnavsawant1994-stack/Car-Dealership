import { describe, expect, it, vi } from 'vitest'
import sharp from 'sharp'

vi.mock('server-only', () => ({}))

import { readInspectionEvidence, validateInspectionEvidence } from './inspection-evidence-storage'

describe('P3-03 private inspection evidence validation', () => {
  it('accepts a genuine image and normalizes it to metadata-stripped WebP', async () => {
    const original = await sharp({ create: {
      width: 480, height: 320, channels: 3,
      background: { r: 170, g: 180, b: 190 },
    } }).jpeg().toBuffer()
    const file = new File([new Uint8Array(original)], 'synthetic-inspection.jpg', { type: 'image/jpeg' })
    const result = await validateInspectionEvidence(file)
    expect(result.mimeType).toBe('image/webp')
    expect(result.extension).toBe('webp')
    expect(result.checksum).toMatch(/^[a-f0-9]{64}$/)
    const output = await sharp(result.buffer).metadata()
    expect(output.format).toBe('webp')
    expect(output.width).toBe(480)
    expect(output.height).toBe(320)
    expect(output.exif).toBeUndefined()
  })
  it('rejects image MIME spoofing and unsupported browser content', async () => {
    const fakeJpeg = new File([new Uint8Array([1,2,3,4,5,6])], 'fake.jpg', { type: 'image/jpeg' })
    await expect(validateInspectionEvidence(fakeJpeg)).rejects.toThrow('INSPECTION_EVIDENCE_SIGNATURE')
    const svg = new File(['<svg/>'], 'script.svg', { type: 'image/svg+xml' })
    await expect(validateInspectionEvidence(svg)).rejects.toThrow('INSPECTION_EVIDENCE_TYPE')
  })
  it('accepts a minimal PDF signature but rejects a mislabeled PDF', async () => {
    const valid = new File(['%PDF-1.7\nFictional document'], 'synthetic.pdf', { type: 'application/pdf' })
    const output = await validateInspectionEvidence(valid)
    expect(output.mimeType).toBe('application/pdf')
    await expect(validateInspectionEvidence(new File(['<html/>'], 'bad.pdf', { type: 'application/pdf' })))
      .rejects.toThrow('INSPECTION_EVIDENCE_SIGNATURE')
  })
  it('refuses arbitrary or traversal storage keys before any private object read', async () => {
    for (const key of ['../../secret.jpg', 'https://example.com/test', 'inspection-evidence/../x.pdf', 'sell-requests/cuid/x.pdf']) {
      await expect(readInspectionEvidence(key)).rejects.toThrow('INVALID_INSPECTION_STORAGE_KEY')
    }
  })
})
