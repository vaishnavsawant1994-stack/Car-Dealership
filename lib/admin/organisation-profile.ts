import { z } from 'zod'
import { businessIdentity } from '@/lib/constants/business'
import { isHostedDemoEnvironment, isDemoEmail } from '@/lib/security/demo-access'

/**
 * Organisation profile reuses SiteSetting. Showroom is the sole source of truth
 * for location and opening hours; no extra Organisation/Branch table is added.
 */
export const organisationKeys = [
  'site_name', 'legal_company_name', 'site_tagline', 'business_type',
  'brand_logo_url', 'business_registration_number', 'business_tax_identifier',
  'primary_phone', 'support_phone', 'sales_email', 'support_email',
  'currency', 'timezone', 'locale',
] as const

export type OrganisationKey = (typeof organisationKeys)[number]
export type OrganisationGroup = 'Identity' | 'Branding' | 'Contact' | 'Preferences' | 'Registration'
export type OrganisationField = {
  key: OrganisationKey
  label: string
  group: OrganisationGroup
  type: 'text' | 'email' | 'select'
  required?: boolean
  maxLength: number
  help?: string
  options?: readonly string[]
}

export const organisationFields: readonly OrganisationField[] = [
  { key: 'site_name', label: 'Display name', group: 'Identity', type: 'text', maxLength: 120, required: true },
  { key: 'legal_company_name', label: 'Legal business name', group: 'Identity', type: 'text', maxLength: 160, required: true },
  { key: 'site_tagline', label: 'Tagline', group: 'Branding', type: 'text', maxLength: 180 },
  { key: 'business_type', label: 'Business type', group: 'Identity', type: 'select', maxLength: 80,
    options: ['Independent dealership', 'Franchise dealership', 'Multi-brand dealership', 'Marketplace'] },
  { key: 'brand_logo_url', label: 'Brand logo asset', group: 'Branding', type: 'text', maxLength: 250,
    help: 'Use an approved, existing /images/brand/ asset. Uploading new media is not part of this screen.' },
  { key: 'primary_phone', label: 'Primary phone', group: 'Contact', type: 'text', maxLength: 40 },
  { key: 'support_phone', label: 'Support phone', group: 'Contact', type: 'text', maxLength: 40 },
  { key: 'sales_email', label: 'Sales email', group: 'Contact', type: 'email', maxLength: 160 },
  { key: 'support_email', label: 'Support email', group: 'Contact', type: 'email', maxLength: 160 },
  { key: 'currency', label: 'Display currency', group: 'Preferences', type: 'select', maxLength: 3,
    options: ['INR', 'USD', 'EUR', 'GBP'], required: true },
  { key: 'timezone', label: 'Time zone', group: 'Preferences', type: 'select', maxLength: 80,
    options: ['Asia/Kolkata', 'Europe/Berlin', 'Europe/London', 'America/New_York'], required: true },
  { key: 'locale', label: 'Locale', group: 'Preferences', type: 'select', maxLength: 10,
    options: ['en-IN', 'hi-IN', 'en-US', 'en-GB', 'de-DE'], required: true },
  { key: 'business_registration_number', label: 'Registration number', group: 'Registration', type: 'text', maxLength: 100,
    help: 'Administrative information only; do not enter real identifiers in hosted demonstrations.' },
  { key: 'business_tax_identifier', label: 'Tax identifier', group: 'Registration', type: 'text', maxLength: 100,
    help: 'Administrative information only; do not enter real identifiers in hosted demonstrations.' },
]

export const organisationDefaults: Record<OrganisationKey, string> = {
  site_name: businessIdentity.name,
  legal_company_name: businessIdentity.name,
  site_tagline: businessIdentity.tagline,
  business_type: 'Independent dealership',
  brand_logo_url: businessIdentity.logoUrl,
  primary_phone: businessIdentity.phone,
  support_phone: '',
  sales_email: businessIdentity.primaryEmail,
  support_email: businessIdentity.secondaryEmail,
  currency: 'INR',
  timezone: 'Asia/Kolkata',
  locale: 'en-IN',
  business_registration_number: '',
  business_tax_identifier: '',
}

export function categoryForOrganisationSetting(key: OrganisationKey): 'contact' | 'general' {
  return ['primary_phone', 'support_phone', 'sales_email', 'support_email'].includes(key) ? 'contact' : 'general'
}

export type OrganisationSetting = { value: string; version: number }
export type OrganisationSettings = Record<OrganisationKey, OrganisationSetting>
export type OrganisationChange = { key: OrganisationKey; value: string; version: number }

const keySchema = z.enum(organisationKeys)
export const organisationUpdateSchema = z.object({
  changes: z.array(z.object({
    key: keySchema,
    value: z.string().trim().max(250),
    version: z.number().int().min(0),
  }).strict()).min(1).max(organisationKeys.length),
}).strict().superRefine((payload, context) => {
  const seen = new Set<string>()
  for (const [index, change] of payload.changes.entries()) {
    if (seen.has(change.key)) context.addIssue({
      code: 'custom', path: ['changes', index, 'key'], message: 'Duplicate profile field.',
    })
    seen.add(change.key)
    const problem = validateOrganisationValue(change.key, change.value, 'local')
    if (problem) context.addIssue({
      code: 'custom', path: ['changes', index, 'value'], message: problem,
    })
  }
})

export function validateOrganisationValue(key: OrganisationKey, value: string, environment: string): string | null {
  const field = organisationFields.find((item) => item.key === key)
  if (!field || value.length > field.maxLength) return 'Value is too long.'
  if (field.required && !value) return 'This field is required.'
  if (field.options && !field.options.includes(value)) return 'Choose an approved option.'
  if (key === 'site_name' || key === 'legal_company_name') {
    if (value.length < 2) return 'Use at least two characters.'
    if (isHostedDemoEnvironment(environment) && !/demo|demonstration/i.test(value)) {
      return 'Hosted demonstrations must retain an explicitly fictional business identity.'
    }
  }
  if ((key === 'sales_email' || key === 'support_email') && value) {
    if (!z.email().safeParse(value).success) return 'Enter a valid email address.'
    if (isHostedDemoEnvironment(environment) && !isDemoEmail(value)) {
      return 'Hosted demonstrations accept only car-dealership.test email addresses.'
    }
  }
  if (key === 'brand_logo_url' && value && !/^\/images\/brand\/[a-z0-9][a-z0-9/_-]*\.(?:svg|png|webp)$/.test(value)) {
    return 'Select an approved local brand image asset.'
  }
  if (isHostedDemoEnvironment(environment)) {
    if (['business_registration_number', 'business_tax_identifier'].includes(key) && value) {
      return 'Real legal or tax identifiers are not permitted in hosted demonstrations.'
    }
    if ((key === 'primary_phone' || key === 'support_phone') && value &&
        !['Demo enquiries only', 'Not available in demo'].includes(value)) {
      return 'Hosted demonstrations cannot publish a real contact number.'
    }
  }
  return null
}

export function validateOrganisationChanges(changes: readonly OrganisationChange[], environment: string): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const change of changes) {
    const error = validateOrganisationValue(change.key, change.value, environment)
    if (error) errors[change.key] = error
  }
  return errors
}

export function mapOrganisationSettings(
  rows: ReadonlyArray<{ key: string; value: string; version: number }>,
): OrganisationSettings {
  const settings = {} as OrganisationSettings
  for (const key of organisationKeys) {
    const stored = rows.find((item) => item.key === key)
    settings[key] = stored
      ? { value: stored.value, version: stored.version }
      : { value: organisationDefaults[key], version: 0 }
  }
  return settings
}
