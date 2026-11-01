import { describe, expect, it } from 'vitest'
import { UserRole } from '@prisma/client'
import { hasPermission } from '@/lib/auth/admin-permissions'
import {
  categoryForOrganisationSetting, mapOrganisationSettings, organisationDefaults, organisationKeys,
  organisationUpdateSchema, validateOrganisationChanges, validateOrganisationValue,
} from './organisation-profile'

describe('P1-02 organisation profile contracts and hosted sandbox protection', () => {
  it('preserves the existing General and Contact settings categories', () => {
    expect(categoryForOrganisationSetting('site_name')).toBe('general')
    expect(categoryForOrganisationSetting('business_registration_number')).toBe('general')
    expect(categoryForOrganisationSetting('sales_email')).toBe('contact')
    expect(categoryForOrganisationSetting('primary_phone')).toBe('contact')
  })

  it('maps existing SiteSetting versions without creating duplicate models', () => {
    const result = mapOrganisationSettings([{ key: 'site_name', value: 'Fictional Demo Motors', version: 7 }])
    expect(result.site_name).toEqual({ value: 'Fictional Demo Motors', version: 7 })
    expect(result.legal_company_name).toEqual({ value: organisationDefaults.legal_company_name, version: 0 })
    expect(Object.keys(result)).toHaveLength(organisationKeys.length)
  })

  it('allows valid and minimal changes while rejecting unknown/duplicate keys', () => {
    expect(organisationUpdateSchema.safeParse({
      changes: [{ key: 'site_name', value: 'Car Dealership Demo', version: 0 }],
    }).success).toBe(true)
    expect(organisationUpdateSchema.safeParse({ changes: [] }).success).toBe(false)
    expect(organisationUpdateSchema.safeParse({ changes: [{ key: 'api_secret', value: 'x', version: 0 }] }).success).toBe(false)
    expect(organisationUpdateSchema.safeParse({
      changes: [{ key: 'site_name', value: 'Demo A', version: 1 }, { key: 'site_name', value: 'Demo B', version: 1 }],
    }).success).toBe(false)
    expect(organisationUpdateSchema.safeParse({
      changes: [{ key: 'site_name', value: 'Car Dealership Demo', version: -1 }],
    }).success).toBe(false)
  })

  it('rejects fake logo URL schemes and path traversal', () => {
    for (const value of ['https://evil.example/image.svg', '//evil.example/a.svg', '/images/brand/../../private.svg', 'javascript:alert(1)', '/images/other/car.svg']) {
      expect(validateOrganisationValue('brand_logo_url', value, 'local')).toBeTruthy()
    }
    expect(validateOrganisationValue('brand_logo_url', '/images/brand/car-dealership-demo.svg', 'staging')).toBeNull()
  })

  it('keeps hosted settings fictional and contact channels inert', () => {
    for (const env of ['staging', 'preview', 'demo']) {
      for (const key of ['site_name', 'legal_company_name'] as const) {
        expect(validateOrganisationValue(key, 'Actual Dealership Pvt Ltd', env)).toBeTruthy()
        expect(validateOrganisationValue(key, 'Car Dealership Demo', env)).toBeNull()
      }
      expect(validateOrganisationValue('sales_email', 'sales@real-business.com', env)).toBeTruthy()
      expect(validateOrganisationValue('sales_email', 'demo.sales@car-dealership.test', env)).toBeNull()
      expect(validateOrganisationValue('primary_phone', '+919876543210', env)).toBeTruthy()
      expect(validateOrganisationValue('primary_phone', 'Demo enquiries only', env)).toBeNull()
      expect(validateOrganisationValue('business_registration_number', 'REAL-TAX-ID', env)).toBeTruthy()
      expect(validateOrganisationValue('business_tax_identifier', 'GST123', env)).toBeTruthy()
    }
    expect(validateOrganisationChanges([{ key: 'business_tax_identifier', value: 'GST123', version: 0 }], 'demo')).toHaveProperty('business_tax_identifier')
  })

  it('requires approved enumerations and bounded text', () => {
    expect(validateOrganisationValue('currency', 'DOGE', 'local')).toBeTruthy()
    expect(validateOrganisationValue('timezone', 'Some/Unknown', 'local')).toBeTruthy()
    expect(validateOrganisationValue('locale', 'garbage', 'local')).toBeTruthy()
    expect(validateOrganisationValue('site_name', 'X'.repeat(121), 'local')).toBeTruthy()
    expect(validateOrganisationValue('support_email', 'invalid', 'local')).toBeTruthy()
  })

  it('reuses existing staff settings permissions rather than inventing a new admin role', () => {
    expect(hasPermission(UserRole.SUPER_ADMIN, 'settings.update')).toBe(true)
    expect(hasPermission(UserRole.ADMIN, 'settings.update')).toBe(true)
    expect(hasPermission(UserRole.CONTENT_MANAGER, 'settings.view')).toBe(true)
    expect(hasPermission(UserRole.CONTENT_MANAGER, 'settings.update')).toBe(false)
    expect(hasPermission(UserRole.SALES, 'settings.view')).toBe(false)
    expect(hasPermission(UserRole.CUSTOMER, 'settings.update')).toBe(false)
  })
})
