import 'server-only'

import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import sharp from 'sharp'

const MAX_FILE_SIZE = 8 * 1024 * 1024
const allowedExtensions: Record<string, readonly string[]> = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
  'application/pdf': ['pdf'],
}
export type InspectionEvidenceFile = {
  storageKey: string; originalName: string; mimeType: string; sizeBytes: number; checksum: string
}

function storageDriver() {
  const driver = process.env.PRIVATE_STORAGE_DRIVER ?? process.env.IMAGE_STORAGE_DRIVER ??
    (process.env.NODE_ENV !== 'production' ? 'local' : '')
  if (driver === 's3') return 's3'
  if (driver === 'local' && process.env.NODE_ENV !== 'production') return 'local'
  throw new Error('PRIVATE_STORAGE_NOT_CONFIGURED')
}
function privateRoot() { return path.join(process.cwd(), 'artifacts', 'private-uploads', 'inspection-evidence') }
function requireSafeKey(key: string) {
  if (!/^inspection-evidence\/[a-z0-9_-]{10,50}\/[a-f0-9-]{36}\.(webp|pdf)$/.test(key)) {
    throw new Error('INVALID_INSPECTION_STORAGE_KEY')
  }
}
function client() {
  const { S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_PRIVATE_BUCKET } = process.env
  if (!S3_PRIVATE_BUCKET || !S3_ENDPOINT || !S3_REGION || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
    throw new Error('PRIVATE_STORAGE_NOT_CONFIGURED')
  }
  return new S3Client({
    endpoint: S3_ENDPOINT, region: S3_REGION,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY },
  })
}
function relativeKey(key: string) { return key.replace(/^inspection-evidence\//, '') }

export async function validateInspectionEvidence(file: File) {
  const extensions = allowedExtensions[file.type]
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!extensions?.includes(extension)) throw new Error('INSPECTION_EVIDENCE_TYPE')
  if (file.size <= 0 || file.size > MAX_FILE_SIZE) throw new Error('INSPECTION_EVIDENCE_SIZE')
  const original = Buffer.from(await file.arrayBuffer())
  if (file.type === 'application/pdf') {
    if (original.subarray(0, 5).toString() !== '%PDF-') throw new Error('INSPECTION_EVIDENCE_SIGNATURE')
    return { buffer: original, mimeType: 'application/pdf', extension: 'pdf' as const,
      checksum: createHash('sha256').update(original).digest('hex') }
  }
  const valid = file.type === 'image/jpeg'
    ? original[0] === 0xff && original[1] === 0xd8 && original[2] === 0xff
    : file.type === 'image/png'
      ? original.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : original.subarray(0, 4).toString() === 'RIFF' && original.subarray(8, 12).toString() === 'WEBP'
  if (!valid) throw new Error('INSPECTION_EVIDENCE_SIGNATURE')
  const metadata = await sharp(original, { limitInputPixels: 60_000_000 }).metadata()
  if (!metadata.width || !metadata.height || metadata.width > 12000 || metadata.height > 12000) {
    throw new Error('INSPECTION_EVIDENCE_DIMENSIONS')
  }
  // Normalize orientation and strip EXIF/GPS and arbitrary file metadata.
  const buffer = await sharp(original).rotate().webp({ quality: 88 }).toBuffer()
  return { buffer, mimeType: 'image/webp', extension: 'webp' as const,
    checksum: createHash('sha256').update(buffer).digest('hex') }
}

export async function storeInspectionEvidence(inspectionId: string, file: File): Promise<InspectionEvidenceFile> {
  if (!/^[a-z0-9_-]{10,50}$/.test(inspectionId)) throw new Error('INVALID_INSPECTION_ID')
  const { buffer, mimeType, extension, checksum } = await validateInspectionEvidence(file)
  const key = `inspection-evidence/${inspectionId}/${randomUUID()}.${extension}`
  requireSafeKey(key)
  if (storageDriver() === 's3') {
    await client().send(new PutObjectCommand({
      Bucket: process.env.S3_PRIVATE_BUCKET!, Key: key, Body: buffer,
      ContentType: mimeType, CacheControl: 'private, no-store',
    }))
  } else {
    const target = path.join(privateRoot(), relativeKey(key))
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, buffer, { flag: 'wx' })
  }
  return { storageKey: key, originalName: path.basename(file.name).replace(/[\r\n"]/g, '_').slice(0, 180),
    mimeType, sizeBytes: buffer.length, checksum }
}

export async function readInspectionEvidence(key: string) {
  requireSafeKey(key)
  if (storageDriver() === 's3') {
    const response = await client().send(new GetObjectCommand({ Bucket: process.env.S3_PRIVATE_BUCKET!, Key: key }))
    if (!response.Body) throw new Error('INSPECTION_EVIDENCE_NOT_FOUND')
    return Buffer.from(await response.Body.transformToByteArray())
  }
  return readFile(path.join(privateRoot(), relativeKey(key)))
}

export async function deleteInspectionEvidenceObject(key: string) {
  requireSafeKey(key)
  if (storageDriver() === 's3') {
    await client().send(new DeleteObjectCommand({ Bucket: process.env.S3_PRIVATE_BUCKET!, Key: key }))
  } else {
    await unlink(path.join(privateRoot(), relativeKey(key))).catch((error: unknown) => {
      if ((error as { code?: string }).code !== 'ENOENT') throw error
    })
  }
}
