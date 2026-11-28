import 'server-only'

import { randomUUID } from 'node:crypto'
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import sharp from 'sharp'
import type { ImageStorageAdapter, StoredImage } from './types'

export function vehicleImageObjectKeys(storageKey: string): string[] {
  const parts = storageKey.split('/')
  if (parts.length !== 3 || parts[0] !== 'vehicles' || !parts[1] || !parts[2] || storageKey.includes('..')) throw new Error('INVALID_STORAGE_KEY')
  const base = storageKey.replace(/\.[^.]+$/, '')
  return [storageKey, 'thumbnail', 'card', 'gallery', 'openGraph'].map((variant, index) =>
    index === 0 ? variant : `${base}-${variant}.webp`,
  )
}

export class S3ImageStorage implements ImageStorageAdapter {
  private bucket: string
  private publicBase: string
  private client: S3Client
  constructor() {
    const bucket = process.env.S3_BUCKET
    const endpoint = process.env.S3_ENDPOINT
    const region = process.env.S3_REGION
    const accessKeyId = process.env.S3_ACCESS_KEY_ID
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY
    const publicBase = process.env.S3_PUBLIC_BASE_URL
    if (!bucket || !endpoint || !region || !accessKeyId || !secretAccessKey || !publicBase) throw new Error('S3 storage is selected but required S3_* configuration is missing.')
    this.bucket = bucket
    this.publicBase = publicBase.replace(/\/$/, '')
    this.client = new S3Client({ endpoint, region, forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true', credentials: { accessKeyId, secretAccessKey } })
  }
  async createUploadUrl(input: { vehicleId: string; filename: string; contentType: string }) {
    const safe = input.filename.toLowerCase().replace(/[^a-z0-9.-]+/g, '-')
    const storageKey = `vehicles/${input.vehicleId}/${randomUUID()}-${safe}`
    const uploadUrl = await getSignedUrl(this.client, new PutObjectCommand({ Bucket: this.bucket, Key: storageKey, ContentType: input.contentType }), { expiresIn: 300 })
    return { uploadUrl, storageKey, method: 'PUT' as const }
  }
  async completeUpload(input: { vehicleId: string; storageKey: string; buffer?: Buffer; contentType: string }): Promise<StoredImage> {
    if (!input.buffer || !this.validateOwnership(input.vehicleId, input.storageKey)) throw new Error('INVALID_S3_UPLOAD')
    const normalized = await sharp(input.buffer).rotate().webp({ quality: 88 }).toBuffer()
    try {
      await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: input.storageKey, Body: normalized, ContentType: 'image/webp' }))
      const metadata = await sharp(normalized).metadata()
      const variants = await this.generateVariants({ storageKey: input.storageKey, buffer: normalized })
      return { storageKey: input.storageKey, publicUrl: this.getPublicUrl(input.storageKey), variants, width: metadata.width ?? 0, height: metadata.height ?? 0, sizeBytes: normalized.byteLength, mimeType: 'image/webp', checksum: '' }
    } catch (error) {
      await this.deleteObject(input.storageKey).catch(() => undefined)
      throw error
    }
  }
  async generateVariants(input: { storageKey: string; buffer: Buffer }) {
    const specs = { thumbnail: [320, 220], card: [720, 480], gallery: [1600, 1067], openGraph: [1200, 630] } as const
    const result: Record<string, string> = {}
    for (const [variant, [width, height]] of Object.entries(specs)) {
      const key = input.storageKey.replace(/(\.[^.]+)?$/, `-${variant}.webp`)
      const body = await sharp(input.buffer).resize(width, height, { fit: 'cover', position: 'attention' }).webp({ quality: 84 }).toBuffer()
      await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: 'image/webp' }))
      result[variant] = this.getPublicUrl(key)
    }
    return result
  }
  async deleteObject(storageKey: string) {
    await Promise.all(vehicleImageObjectKeys(storageKey).map((Key) => this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key }))))
  }
  getPublicUrl(storageKey: string) { return `${this.publicBase}/${storageKey}` }
  validateOwnership(vehicleId: string, storageKey: string) { return storageKey.startsWith(`vehicles/${vehicleId}/`) && !storageKey.includes('..') }
}
