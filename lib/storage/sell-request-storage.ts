import 'server-only'

import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const allowedExtensions: Record<string, string[]> = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'application/pdf': ['pdf'],
}

export type StoredSellAttachment = {
  storageKey: string
  originalName: string
  mimeType: string
  sizeBytes: number
  checksum: string
}

function privateStorageRoot() {
  return path.join(process.cwd(), 'artifacts', 'private-uploads', 'sell-requests')
}

function s3Client() {
  const endpoint = process.env.S3_ENDPOINT
  const region = process.env.S3_REGION
  const accessKeyId = process.env.S3_ACCESS_KEY_ID
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY
  if (!process.env.S3_PRIVATE_BUCKET || !endpoint || !region || !accessKeyId || !secretAccessKey) throw new Error('PRIVATE_STORAGE_NOT_CONFIGURED')
  return new S3Client({ endpoint, region, forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true', credentials: { accessKeyId, secretAccessKey } })
}

function usesS3() {
  return (process.env.PRIVATE_STORAGE_DRIVER ?? process.env.IMAGE_STORAGE_DRIVER ?? (process.env.NODE_ENV === 'production' ? '' : 'local')) === 's3'
}

function assertSafeKey(storageKey: string) {
  if (!/^sell-requests\/[a-zA-Z0-9_-]+\/[a-f0-9-]+\.(jpg|jpeg|png|pdf)$/.test(storageKey)) throw new Error('INVALID_STORAGE_KEY')
}

async function validatedFile(file: File) {
  const extensions = allowedExtensions[file.type]
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!extensions?.includes(extension)) throw new Error('UNSUPPORTED_ATTACHMENT_TYPE')
  if (file.size <= 0 || file.size > MAX_FILE_SIZE) throw new Error('ATTACHMENT_SIZE_INVALID')
  const buffer = Buffer.from(await file.arrayBuffer())
  const validSignature = file.type === 'image/jpeg'
    ? buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
    : file.type === 'image/png'
      ? buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : buffer.subarray(0, 5).toString() === '%PDF-'
  if (!validSignature) throw new Error('ATTACHMENT_SIGNATURE_MISMATCH')
  return { buffer, extension, checksum: createHash('sha256').update(buffer).digest('hex') }
}

export async function storeSellAttachment(requestId: string, file: File): Promise<StoredSellAttachment> {
  const { buffer, extension, checksum } = await validatedFile(file)
  const storageKey = `sell-requests/${requestId}/${randomUUID()}.${extension}`
  if (usesS3()) {
    await s3Client().send(new PutObjectCommand({ Bucket: process.env.S3_PRIVATE_BUCKET!, Key: storageKey, Body: buffer, ContentType: file.type }))
  } else {
    if (process.env.NODE_ENV === 'production') throw new Error('PRIVATE_STORAGE_NOT_CONFIGURED')
    const directory = path.join(privateStorageRoot(), requestId)
    await mkdir(directory, { recursive: true })
    await writeFile(path.join(privateStorageRoot(), storageKey.replace('sell-requests/', '')), buffer)
  }
  return { storageKey, originalName: path.basename(file.name).slice(0, 180), mimeType: file.type, sizeBytes: buffer.byteLength, checksum }
}

export async function readSellAttachment(storageKey: string) {
  assertSafeKey(storageKey)
  if (usesS3()) {
    const result = await s3Client().send(new GetObjectCommand({ Bucket: process.env.S3_PRIVATE_BUCKET!, Key: storageKey }))
    if (!result.Body) throw new Error('ATTACHMENT_NOT_FOUND')
    return Buffer.from(await result.Body.transformToByteArray())
  }
  return readFile(path.join(privateStorageRoot(), storageKey.replace('sell-requests/', '')))
}

export async function deleteSellAttachment(storageKey: string) {
  assertSafeKey(storageKey)
  if (usesS3()) await s3Client().send(new DeleteObjectCommand({ Bucket: process.env.S3_PRIVATE_BUCKET!, Key: storageKey }))
  else await unlink(path.join(privateStorageRoot(), storageKey.replace('sell-requests/', ''))).catch(() => undefined)
}
