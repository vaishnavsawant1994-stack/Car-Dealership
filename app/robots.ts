import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  if (process.env.APP_ENV !== 'commercial') {
    return { rules: [{ userAgent: '*', disallow: '/' }] }
  }
  const base = process.env.NEXT_PUBLIC_SITE_URL
  if (!base) throw new Error('Commercial site origin must be explicitly configured.')
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/admin/', '/account/', '/api/'] }], sitemap: `${base.replace(/\/$/, '')}/sitemap.xml` }
}
