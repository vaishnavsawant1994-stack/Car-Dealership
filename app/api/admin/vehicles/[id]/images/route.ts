import { VehicleImageCategory } from '@prisma/client'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { adminError, validationError } from '@/lib/admin/api'
import { writeAuditLog } from '@/lib/admin/audit'
import { authorizeAdminRequest } from '@/lib/auth/require-permission'
import { getActorShowroomScope } from '@/lib/auth/showroom-scope'
import { showroomScopeWhere } from '@/lib/auth/admin-resource-policy'
import { prisma } from '@/lib/db/prisma'
import { getImageStorage } from '@/lib/storage'
import { validatePublicImage } from '@/lib/storage/image-validation'

const reorderSchema = z.object({ images: z.array(z.object({ id: z.string().cuid(), sortOrder: z.number().int().nonnegative(), isPrimary: z.boolean() })).min(1).max(40) })

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await authorizeAdminRequest('vehicle.update')
    const scope = await getActorShowroomScope(actor)
    const { id } = await context.params
    const vehicle = await prisma.vehicle.findFirst({ where: { id, ...showroomScopeWhere(scope) }, select: { id: true, stockNumber: true, _count: { select: { images: true } } } })
    if (!vehicle) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Vehicle not found.' } }, { status: 404 })
    if (vehicle._count.images >= 40) return NextResponse.json({ error: { code: 'IMAGE_LIMIT', message: 'A vehicle can contain at most 40 images.' } }, { status: 422 })
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return NextResponse.json({ error: { code: 'FILE_REQUIRED', message: 'Choose an image to upload.' } }, { status: 400 })
    const category = z.enum(VehicleImageCategory).exclude(['DOCUMENT']).safeParse(form.get('category') ?? 'EXTERIOR')
    const altText = z.string().trim().min(3).max(240).safeParse(form.get('altText'))
    if (!category.success || !altText.success) return validationError()
    const validated = await validatePublicImage(file)
    const duplicate = await prisma.vehicleImage.findFirst({ where: { vehicleId: id, checksum: validated.checksum }, select: { id: true } })
    if (duplicate) return NextResponse.json({ error: { code: 'DUPLICATE_IMAGE', message: 'This image has already been uploaded.' } }, { status: 409 })
    const storage = getImageStorage()
    const upload = await storage.createUploadUrl({ vehicleId: id, filename: file.name, contentType: file.type })
    const stored = await storage.completeUpload({ vehicleId: id, storageKey: upload.storageKey, buffer: validated.buffer, contentType: file.type })
    const makePrimary = form.get('isPrimary') === 'true' || vehicle._count.images === 0
    const image = await prisma.$transaction(async (tx) => {
      if (makePrimary) await tx.vehicleImage.updateMany({ where: { vehicleId: id }, data: { isPrimary: false } })
      return tx.vehicleImage.create({ data: { vehicleId: id, url: stored.publicUrl, thumbnailUrl: stored.variants.thumbnail, cardUrl: stored.variants.card, galleryUrl: stored.variants.gallery, openGraphUrl: stored.variants.openGraph, storageKey: stored.storageKey, originalName: file.name, mimeType: stored.mimeType, sizeBytes: stored.sizeBytes, checksum: validated.checksum, width: stored.width, height: stored.height, altText: altText.data, category: category.data, sortOrder: vehicle._count.images, isPrimary: makePrimary } })
    })
    await writeAuditLog({ actorId: actor.id, action: 'VEHICLE_IMAGE_UPLOADED', resourceType: 'Vehicle', resourceId: id, summary: `Uploaded image for ${vehicle.stockNumber}.`, metadata: { imageId: image.id, category: image.category, sizeBytes: image.sizeBytes }, request })
    return NextResponse.json({ data: image, message: 'Image uploaded and variants generated.' }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('IMAGE_')) return NextResponse.json({ error: { code: error.message, message: 'The image failed secure server validation.' } }, { status: 422 })
    return adminError(error)
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await authorizeAdminRequest('vehicle.update')
    const scope = await getActorShowroomScope(actor)
    const { id } = await context.params
    const vehicle = await prisma.vehicle.findFirst({ where: { id, ...showroomScopeWhere(scope) }, select: { id: true } })
    if (!vehicle) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Vehicle not found.' } }, { status: 404 })
    const parsed = reorderSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors)
    const existing = await prisma.vehicleImage.findMany({ where: { vehicleId: id, id: { in: parsed.data.images.map((item) => item.id) } }, select: { id: true } })
    if (existing.length !== parsed.data.images.length || parsed.data.images.filter((item) => item.isPrimary).length !== 1) return NextResponse.json({ error: { code: 'INVALID_IMAGE_ORDER', message: 'Image order or primary selection is invalid.' } }, { status: 422 })
    await prisma.$transaction([prisma.vehicleImage.updateMany({ where: { vehicleId: id }, data: { isPrimary: false } }), ...parsed.data.images.map((item) => prisma.vehicleImage.update({ where: { id: item.id }, data: { sortOrder: item.sortOrder, isPrimary: item.isPrimary } }))])
    await writeAuditLog({ actorId: actor.id, action: 'VEHICLE_IMAGES_REORDERED', resourceType: 'Vehicle', resourceId: id, summary: 'Vehicle images reordered.', request })
    return NextResponse.json({ message: 'Image order saved.' })
  } catch (error) { return adminError(error) }
}
