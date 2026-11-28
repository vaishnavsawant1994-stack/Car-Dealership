import 'server-only'

import { mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import type { ImageStorageAdapter, StoredImage } from './types'

const sizes = { thumbnail: [320, 220], card: [720, 480], gallery: [1600, 1067], openGraph: [1200, 630] } as const

export class LocalImageStorage implements ImageStorageAdapter {
  private root = path.join(process.cwd(), 'public', 'uploads', 'vehicles')
  createUploadUrl(input: { vehicleId: string; filename: string; contentType: string }) {
    const safe = input.filename.toLowerCase().replace(/[^a-z0-9.-]+/g, '-')
    const storageKey = `vehicles/${input.vehicleId}/${Date.now()}-${safe}`
    return Promise.resolve({ uploadUrl: `/api/admin/vehicles/${input.vehicleId}/images`, storageKey, method: 'POST' as const })
  }
  async completeUpload(input: { vehicleId: string; storageKey: string; buffer?: Buffer; contentType: string }): Promise<StoredImage> {
    if (!input.buffer || !this.validateOwnership(input.vehicleId, input.storageKey)) throw new Error('INVALID_LOCAL_UPLOAD')
    const filename = path.basename(input.storageKey)
    const directory = path.join(this.root, input.vehicleId)
    await mkdir(directory, { recursive: true })
    const normalized = await sharp(input.buffer).rotate().webp({ quality: 88 }).toBuffer()
    const originalKey = `vehicles/${input.vehicleId}/${path.parse(filename).name}.webp`
    await writeFile(path.join(directory, `${path.parse(filename).name}.webp`), normalized)
    const metadata = await sharp(normalized).metadata()
    const variants = await this.generateVariants({ storageKey: originalKey, buffer: normalized })
    return { storageKey: originalKey, publicUrl: this.getPublicUrl(originalKey), variants, width: metadata.width ?? 0, height: metadata.height ?? 0, sizeBytes: normalized.byteLength, mimeType: 'image/webp', checksum: '' }
  }
  async generateVariants(input: { storageKey: string; buffer: Buffer }) {
    const vehicleId = input.storageKey.split('/')[1]
    const name = path.parse(path.basename(input.storageKey)).name
    const directory = path.join(this.root, vehicleId)
    const result: Record<string, string> = {}
    for (const [variant, [width, height]] of Object.entries(sizes)) {
      const filename = `${name}-${variant}.webp`
      await writeFile(path.join(directory, filename), await sharp(input.buffer).resize(width, height, { fit: 'cover', position: 'attention' }).webp({ quality: variant === 'thumbnail' ? 78 : 86 }).toBuffer())
      result[variant] = `/uploads/vehicles/${vehicleId}/${filename}`
    }
    return result
  }
  async deleteObject(storageKey: string) {
    const parts = storageKey.split('/')
    if (parts.length !== 3 || parts[0] !== 'vehicles' ||
      !/^[a-zA-Z0-9_-]+$/.test(parts[1]) ||
      !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,254}$/.test(parts[2])) {
      throw new Error('INVALID_STORAGE_KEY')
    }
    const directory = path.join(this.root, parts[1])
    const name = path.parse(parts[2]).name
    await Promise.all([`${name}.webp`, ...Object.keys(sizes).map((variant) => `${name}-${variant}.webp`)].map((file) => unlink(path.join(directory, file)).catch(() => undefined)))
  }
  getPublicUrl(storageKey: string) { return `/uploads/${storageKey}` }
  validateOwnership(vehicleId: string, storageKey: string) { return storageKey.startsWith(`vehicles/${vehicleId}/`) && !storageKey.includes('..') }
}
