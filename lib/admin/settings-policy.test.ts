import { describe, expect, it } from 'vitest'
import { evaluateSettingUpdate, getSettingDefinition, isSettingEditable, settingRegistry } from './settings-policy'

describe('P1-06 safe public settings registry', () => {
  it('classifies only known keys with their canonical category', () => {
    for (const [key, category] of Object.entries(settingRegistry)) {
      expect(getSettingDefinition({ key, category: category.category })).not.toBeNull()
    }
    for (const key of ['smtp_password', 'payment_api_key', 'email_capture_key', 'oauth_token', '__proto__', 'unknown']) {
      expect(getSettingDefinition({ key, category: 'general' })).toBeNull()
    }
  })

  it('rejects category spoofing and unknown settings even when a field has a valid version', () => {
    expect(evaluateSettingUpdate({ key: 'site_name', category: 'email' }, 'Allowed?').allowed).toBe(false)
    expect(evaluateSettingUpdate({ key: 'smtp_password', category: 'general' }, 'secret').allowed).toBe(false)
  })

  it('keeps infrastructure and operational values read-only', () => {
    for (const key of ['site_url', 'currency', 'timezone', 'locale', 'email_preview_status']) {
      const category = key === 'email_preview_status' ? 'email' : 'general'
      expect(isSettingEditable({ key, category })).toBe(false)
      expect(evaluateSettingUpdate({ key, category }, 'changed').allowed).toBe(false)
    }
  })

  it('permits regular text and trims harmless whitespace', () => {
    expect(evaluateSettingUpdate({ key: 'seo_default_title', category: 'seo' }, '  Premium cars  ')).toEqual({ allowed: true, value: 'Premium cars' })
  })

  it('rejects oversized public text', () => {
    const d = evaluateSettingUpdate({ key: 'site_name', category: 'general' }, 'a'.repeat(200))
    expect(d).toMatchObject({ allowed: false, status: 400 })
  })

  it('disables external social URLs and phone/WhatsApp activation in hosted demos', () => {
    for (const env of ['staging', 'preview', 'demo']) {
      for (const key of ['facebook_url', 'youtube_url']) {
        expect(evaluateSettingUpdate({ key, category: 'social' }, 'https://www.facebook.com/demo', env).allowed).toBe(false)
      }
      for (const key of ['primary_phone', 'support_phone', 'whatsapp']) {
        expect(evaluateSettingUpdate({ key, category: 'contact' }, '0000000000', env).allowed).toBe(false)
      }
    }
  })

  it('keeps hosted email destinations on reserved fictional .test recipients', () => {
    expect(evaluateSettingUpdate({ key: 'support_email', category: 'contact' }, 'demo@car-dealership.test', 'staging').allowed).toBe(true)
    expect(evaluateSettingUpdate({ key: 'support_email', category: 'contact' }, 'customer@example.com', 'staging').allowed).toBe(false)
    expect(evaluateSettingUpdate({ key: 'support_email', category: 'contact' }, 'customer@example.com', 'local').allowed).toBe(true)
    expect(evaluateSettingUpdate({ key: 'support_email', category: 'contact' }, 'invalid-email', 'local').allowed).toBe(false)
  })

  it('allows only proper HTTPS links to the matching network', () => {
    const record = { key: 'facebook_url', category: 'social' }
    expect(evaluateSettingUpdate(record, 'https://www.facebook.com/showroom').allowed).toBe(true)
    for (const url of ['javascript:alert(1)', 'http://facebook.com/page', 'https://facebook.com.evil.test/page', 'https://user:pass@facebook.com/page', 'https://evil.test/page']) {
      expect(evaluateSettingUpdate(record, url).allowed).toBe(false)
    }
  })
})
