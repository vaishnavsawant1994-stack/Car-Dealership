import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  if (process.env.APP_ENV !== 'commercial') return []
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001').replace(/\/$/, '')
  const routes = ['', '/inventory', '/brands', '/body-types', '/sell-your-car', '/services', '/services/finance', '/services/insurance', '/services/extended-warranty', '/services/rc-transfer', '/about-us', '/contact', '/our-process', '/why-choose-us', '/testimonials', '/faqs', '/blog', '/terms', '/privacy', '/refund-policy', '/cookie-policy']
  return routes.map((route) => ({ url: `${base}${route}`, lastModified: new Date(), changeFrequency: route === '/inventory' ? 'daily' : 'monthly', priority: route === '' ? 1 : route === '/inventory' ? 0.9 : 0.7 }))
}
