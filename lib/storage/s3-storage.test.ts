import { describe, expect, it } from 'vitest'
import { vi } from 'vitest'
vi.mock('server-only', () => ({}))
import { vehicleImageObjectKeys } from './s3-storage'

describe('S3 vehicle image cleanup keys', () => {
  it('includes the original and every generated variant', () => {
    expect(vehicleImageObjectKeys('vehicles/vehicle-123/front.jpg')).toEqual([
      'vehicles/vehicle-123/front.jpg',
      'vehicles/vehicle-123/front-thumbnail.webp',
      'vehicles/vehicle-123/front-card.webp',
      'vehicles/vehicle-123/front-gallery.webp',
      'vehicles/vehicle-123/front-openGraph.webp',
    ])
  })

  it('rejects keys outside a single vehicle folder', () => {
    expect(() => vehicleImageObjectKeys('vehicles/vehicle-123/../private.jpg')).toThrow('INVALID_STORAGE_KEY')
    expect(() => vehicleImageObjectKeys('other/vehicle-123/front.jpg')).toThrow('INVALID_STORAGE_KEY')
  })
})


describe('local vehicle image cleanup paths', () => {
  it.each([
    'vehicles/../outside.webp',
    'vehicles/vehicle-123/..\\..\\outside.webp',
    'vehicles/vehicle-123/../outside.webp',
    'vehicles/vehicle-123/valid.webp/extra',
  ])('rejects an unsafe cleanup key: %s', async (storageKey) => {
    const { LocalImageStorage } = await import('./local-storage')
    await expect(new LocalImageStorage().deleteObject(storageKey)).rejects.toThrow('INVALID_STORAGE_KEY')
  })
})
