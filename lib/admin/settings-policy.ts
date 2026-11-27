/**
 * P1-06: Canonical, intentionally small registry of site-level configuration.
 * Operational secrets stay in the deployment secret manager, never SiteSetting.
 * Unknown / future keys fail closed until explicitly classified here.
 */
export type SettingsCategory = 'general' | 'contact' | 'social' | 'seo' | 'email'
type Definition = { category: SettingsCategory; editable: boolean; maxLength: number }
export const settingRegistry = {
  site_name: { category: 'general', editable: true, maxLength: 160 },
  legal_company_name: { category: 'general', editable: true, maxLength: 160 },
  site_tagline: { category: 'general', editable: true, maxLength: 240 },
  site_url: { category: 'general', editable: false, maxLength: 500 },
  currency: { category: 'general', editable: false, maxLength: 3 },
  timezone: { category: 'general', editable: false, maxLength: 120 },
  locale: { category: 'general', editable: false, maxLength: 20 },
  inventory_location: { category: 'contact', editable: true, maxLength: 500 },
  primary_phone: { category: 'contact', editable: true, maxLength: 40 },
  support_phone: { category: 'contact', editable: true, maxLength: 40 },
  sales_email: { category: 'contact', editable: true, maxLength: 254 },
  support_email: { category: 'contact', editable: true, maxLength: 254 },
  whatsapp: { category: 'contact', editable: true, maxLength: 40 },
  opening_hours: { category: 'contact', editable: true, maxLength: 500 },
  facebook_url: { category: 'social', editable: true, maxLength: 500 },
  instagram_url: { category: 'social', editable: true, maxLength: 500 },
  youtube_url: { category: 'social', editable: true, maxLength: 500 },
  linkedin_url: { category: 'social', editable: true, maxLength: 500 },
  seo_default_title: { category: 'seo', editable: true, maxLength: 160 },
  seo_default_description: { category: 'seo', editable: true, maxLength: 500 },
  email_preview_status: { category: 'email', editable: false, maxLength: 100 },
} as const satisfies Record<string, Definition>

export type RegisteredSettingKey = keyof typeof settingRegistry
export type SettingRecord = { key: string; category: string }

const hosted = new Set(['staging', 'demo', 'preview'])
const hostedContactKeys = new Set<string>(['primary_phone', 'support_phone', 'whatsapp'])
const socialHosts: Record<string, readonly string[]> = {
  facebook_url: ['facebook.com', 'www.facebook.com'],
  instagram_url: ['instagram.com', 'www.instagram.com'],
  youtube_url: ['youtube.com', 'www.youtube.com', 'youtu.be'],
  linkedin_url: ['linkedin.com', 'www.linkedin.com'],
}

export function getSettingDefinition(record: SettingRecord): Definition | null {
  if (!Object.prototype.hasOwnProperty.call(settingRegistry, record.key)) return null
  const config = settingRegistry[record.key as RegisteredSettingKey]
  return config.category === record.category ? config : null
}

export function isSettingEditable(record: SettingRecord, environment = 'local') {
  const config = getSettingDefinition(record)
  if (!config?.editable) return false
  if (hosted.has(environment) && (hostedContactKeys.has(record.key) || Object.prototype.hasOwnProperty.call(socialHosts, record.key))) return false
  return true
}

export type SettingDecision =
  | { allowed: true; value: string }
  | { allowed: false; status: 400 | 403; message: string }

/** Server-side policy, called before any database mutation; UI visibility is not a security boundary. */
export function evaluateSettingUpdate(record: SettingRecord, value: string, environment = 'local'): SettingDecision {
  const config = getSettingDefinition(record)
  if (!config || !config.editable || !isSettingEditable(record, environment)) {
    return { allowed: false, status: 403, message: 'This setting cannot be changed through the admin interface.' }
  }
  const normalized = value.trim()
  if (normalized.length > config.maxLength) {
    return { allowed: false, status: 400, message: 'This setting exceeds its permitted length.' }
  }
  if ((record.key === 'sales_email' || record.key === 'support_email') && normalized) {
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
    if (!emailValid || (hosted.has(environment) && !/^[a-z0-9._+-]+@car-dealership\.test$/i.test(normalized))) {
      return { allowed: false, status: 400, message: 'A valid and environment-approved email address is required.' }
    }
  }
  const allowedHosts = socialHosts[record.key]
  if (allowedHosts && normalized) {
    try {
      const url = new URL(normalized)
      if (url.protocol !== 'https:' || url.username || url.password || !allowedHosts.includes(url.hostname.toLowerCase())) {
        throw new Error('invalid link')
      }
    } catch {
      return { allowed: false, status: 400, message: 'Use an HTTPS link to the selected social network.' }
    }
  }
  return { allowed: true, value: normalized }
}
