import { FeatureCategory } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import { catalogSchemas, isCatalogResource, isSafeCatalogImageUrl, isSafeCatalogWebsiteUrl } from './catalog'

const brand = {
  name: 'Fictional Luxury',
  slug: 'fictional-luxury',
  description: 'Synthetic brand',
  active: true,
  logoUrl: '/images/brands/fictional-luxury.svg',
  logoAlt: 'Fictional Luxury emblem',
  country: 'India',
  featured: false,
  displayOrder: 1,
}

describe('P1-09 catalog and shared validation', () => {
  it('recognizes only own catalog resource keys', () => {
    for (const kind of ['brands', 'body-types', 'features']) expect(isCatalogResource(kind)).toBe(true)
    for (const kind of ['__proto__', 'constructor', 'toString', 'unknown', '']) expect(isCatalogResource(kind)).toBe(false)
  })

  it('accepts canonical safe brand and feature records', () => {
    expect(catalogSchemas.brands.safeParse(brand).success).toBe(true)
    expect(catalogSchemas.features.safeParse({
      name: 'Fictional option', slug: 'fictional-option', description: '', active: true,
      category: FeatureCategory.SAFETY,
    }).success).toBe(true)
  })

  it('allows only local root-relative or HTTPS image URLs', () => {
    expect(isSafeCatalogImageUrl('/images/brands/test.svg')).toBe(true)
    expect(isSafeCatalogImageUrl('https://cdn.example.com/image.webp?size=1')).toBe(true)
    for (const invalid of [
      '//evil.test/image.png', '/images/../private.png', 'data:image/svg+xml;base64,AAA',
      'javascript:alert(1)', 'http://example.com/image.png',
      'https://127.0.0.1/private', 'https://localhost/private',
    ]) expect(isSafeCatalogImageUrl(invalid)).toBe(false)
  })

  it('rejects insecure or credentialed external websites', () => {
    expect(isSafeCatalogWebsiteUrl('')).toBe(true)
    expect(isSafeCatalogWebsiteUrl('https://example.com')).toBe(true)
    for (const invalid of ['http://example.com', 'javascript:alert(1)', 'https://user:pass@example.com']) {
      expect(isSafeCatalogWebsiteUrl(invalid)).toBe(false)
      expect(catalogSchemas.brands.safeParse({ ...brand, websiteUrl: invalid }).success).toBe(false)
    }
  })

  it('rejects invalid media in brand and body-type schemas', () => {
    expect(catalogSchemas.brands.safeParse({ ...brand, logoUrl: 'javascript:alert(1)' }).success).toBe(false)
    expect(catalogSchemas['body-types'].safeParse({
      name: 'Synthetic SUV', slug: 'synthetic-suv', description: '', active: true,
      imageUrl: 'data:image/svg+xml,<svg/>',
    }).success).toBe(false)
  })
})
