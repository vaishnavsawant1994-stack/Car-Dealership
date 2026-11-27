import 'dotenv/config'
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  authorizeAdminRequest: vi.fn(),
  deleteObject: vi.fn(),
  writeAuditLog: vi.fn(),
}))
vi.mock('@/lib/auth/require-permission', () => ({
  ...mocks,
  AdminPermissionError: class AdminPermissionError extends Error {},
}))
vi.mock('@/lib/storage', () => ({ getImageStorage: () => ({ deleteObject: mocks.deleteObject }) }))
vi.mock('@/lib/admin/audit', () => ({ writeAuditLog: mocks.writeAuditLog }))

import { UserRole } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { DELETE } from '@/app/api/admin/vehicles/[id]/images/[imageId]/route'

const storageKey = `vehicles/test-vehicle/cleanup-${Date.now()}.webp`
let imageId = ''

function assertIsolatedTestDatabase() {
  const database = new URL(process.env.DATABASE_URL ?? 'postgresql://invalid/invalid')
  if (process.env.APP_ENV !== 'test' || !['localhost', '127.0.0.1', '::1'].includes(database.hostname) ||
    database.pathname !== '/car_dealership_test') {
    throw new Error('Vehicle image deletion tests only run against the isolated loopback CI database.')
  }
}

afterEach(async () => {
  if (imageId) await prisma.vehicleImage.deleteMany({ where: { id: imageId } })
  imageId = ''
  mocks.authorizeAdminRequest.mockReset()
  mocks.deleteObject.mockReset()
  mocks.writeAuditLog.mockReset()
})
afterAll(async () => prisma.$disconnect())

describe('vehicle image deletion cleanup', () => {
  it('retains the database row for retry when object cleanup fails', async () => {
    assertIsolatedTestDatabase()
    const vehicle = await prisma.vehicle.findFirstOrThrow({ select: { id: true } })
    const key = `vehicles/${vehicle.id}/cleanup-${Date.now()}.webp`
    const image = await prisma.vehicleImage.create({
      data: { vehicleId: vehicle.id, url: `https://images.example.test/${key}`, storageKey: key, altText: 'Synthetic cleanup image' },
      select: { id: true },
    })
    imageId = image.id
    mocks.authorizeAdminRequest.mockResolvedValue({ id: 'test-super-admin', role: UserRole.SUPER_ADMIN })
    mocks.deleteObject.mockRejectedValueOnce(new Error('synthetic object-store failure'))

    const context = { params: Promise.resolve({ id: vehicle.id, imageId }) }
    const first = await DELETE(new Request('http://localhost/api/admin/vehicles'), context)
    expect(first.status).toBe(500)
    expect(await prisma.vehicleImage.findUnique({ where: { id: imageId } })).not.toBeNull()
    expect(mocks.writeAuditLog).not.toHaveBeenCalled()

    mocks.deleteObject.mockResolvedValue(undefined)
    const retry = await DELETE(new Request('http://localhost/api/admin/vehicles'), context)
    expect(retry.status).toBe(200)
    expect(await prisma.vehicleImage.findUnique({ where: { id: imageId } })).toBeNull()
    expect(mocks.deleteObject).toHaveBeenCalledWith(key)
    expect(mocks.writeAuditLog).toHaveBeenCalledTimes(1)
  })
})

