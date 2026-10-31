import { describe, expect, it } from 'vitest'
import { buildVehicleWhatsAppUrl, buildWhatsAppUrl, businessIdentity } from './business'

describe('car-dealership demonstration contact isolation', () => {
  it('uses a neutral identity with no real contact number', () => {
    expect(businessIdentity.name).toBe('Car Dealership Demo')
    expect(businessIdentity.whatsappNumber).toBe('')
    expect(businessIdentity.primaryEmail.endsWith('.test')).toBe(true)
  })

  it('routes WhatsApp attempts to the internal contact form during Phase 0', () => {
    expect(buildWhatsAppUrl()).toBe('/contact')
    expect(buildWhatsAppUrl('A test enquiry', '+91 90000 00000')).toBe('/contact')
  })

  it('routes vehicle-specific actions to the demo contact form', () => {
    expect(buildVehicleWhatsAppUrl({ year: 2023, make: 'Hyundai', model: 'Creta', variant: 'SX', stockNumber: 'CD-123' })).toBe('/contact')
  })
})
