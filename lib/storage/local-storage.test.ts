import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('node:crypto', () => ({ randomUUID: vi.fn() }))

import { randomUUID } from 'node:crypto'
import { LocalImageStorage } from './local-storage'

describe('local vehicle image upload keys', () => {
  it('uses a unique identifier even when filenames and timestamps match', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(123)
    vi.mocked(randomUUID)
      .mockReturnValueOnce('first-upload-id')
      .mockReturnValueOnce('second-upload-id')

    const storage = new LocalImageStorage()
    const input = { vehicleId: 'vehicle-123', filename: 'Front View.JPG', contentType: 'image/jpeg' }
    const first = await storage.createUploadUrl(input)
    const second = await storage.createUploadUrl(input)

    expect(first.storageKey).toBe('vehicles/vehicle-123/first-upload-id-front-view.jpg')
    expect(second.storageKey).toBe('vehicles/vehicle-123/second-upload-id-front-view.jpg')
    expect(second.storageKey).not.toBe(first.storageKey)
  })
})
