import { FeatureCategory } from '@prisma/client'
import { z } from 'zod'
import type { AdminPermission } from '@/lib/auth/admin-permissions'

export const resourcePermissions = {
  brands: 'brand.manage',
  'body-types': 'bodyType.manage',
  features: 'feature.manage',
} satisfies Record<string, AdminPermission>
export type CatalogResource = keyof typeof resourcePermissions

/** 'in' erroneously accepts inherited keys such as __proto__ or constructor. */
export function isCatalogResource(value: string): value is CatalogResource {
  return Object.prototype.hasOwnProperty.call(resourcePermissions, value)
}

export function isSafeCatalogImageUrl(value: string): boolean {
  if (value.startsWith('/')) {
    // Accept root-relative images only; no protocol-relative URLs or path traversal.
    return /^\/(?!\/)[a-zA-Z0-9/_-]+(?:\.[a-zA-Z0-9]+)?$/.test(value)
      && !value.split('/').some((segment) => segment === '..' || segment === '.')
  }
  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase()
    return url.protocol === 'https:' && !url.username && !url.password &&
      host.includes('.') && host !== 'localhost' && !host.endsWith('.local') &&
      !/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host) &&
      !host.startsWith('[')
  } catch {
    return false
  }
}

export function isSafeCatalogWebsiteUrl(value: string): boolean {
  if (!value) return true
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password
  } catch {
    return false
  }
}

const base = {
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().max(1000).default(''),
  active: z.boolean().default(true),
}

export const catalogSchemas = {
  brands: z.object({
    ...base,
    logoUrl: z.string().trim().min(1).max(1000).refine(isSafeCatalogImageUrl, 'Use a root-relative image or an HTTPS image URL.'),
    logoAlt: z.string().trim().min(2).max(160),
    websiteUrl: z.string().trim().max(1000).refine(isSafeCatalogWebsiteUrl, 'Use an HTTPS website URL.').optional().or(z.literal('')),
    country: z.string().trim().min(2).max(80),
    featured: z.boolean().default(false),
    displayOrder: z.number().int().nonnegative().default(0),
  }),
  'body-types': z.object({
    ...base,
    icon: z.string().trim().max(80).optional().or(z.literal('')),
    imageUrl: z.string().trim().max(1000).refine((value) => !value || isSafeCatalogImageUrl(value), 'Use a root-relative image or an HTTPS image URL.').optional().or(z.literal('')),
    featured: z.boolean().default(false),
    displayOrder: z.number().int().nonnegative().default(0),
  }),
  features: z.object({
    ...base,
    category: z.enum(FeatureCategory),
    icon: z.string().trim().max(80).optional().or(z.literal('')),
  }),
}
