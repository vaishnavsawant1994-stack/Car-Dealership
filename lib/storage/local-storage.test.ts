import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('node:crypto', () => ({ randomUUID: vi.fn() }))

import { randomUUID } from 'node:crypto'
import { LocalImageStorage } from './local-storage'

describe('local vehicle image upload keys', () => {
  it('uses a unique identifier even when filenames and timestamps match', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(123)
    vi.mocked(randomUUID)
      .mockReturnValueOnce('11111111-1111-4111-8111-111111111111')
      .mockReturnValueOnce('22222222-2222-4222-8222-222222222222')

    const storage = new LocalImageStorage()
    const input = { vehicleId: 'vehicle-123', filename: 'Front View.JPG', contentType: 'image/jpeg' }
    const first = await storage.createUploadUrl(input)
    const second = await storage.createUploadUrl(input)

    expect(first.storageKey).toBe('vehicles/vehicle-123/11111111-1111-4111-8111-111111111111-front-view.jpg')
    expect(second.storageKey).toBe('vehicles/vehicle-123/22222222-2222-4222-8222-222222222222-front-view.jpg')
    expect(second.storageKey).not.toBe(first.storageKey)
  })
})
