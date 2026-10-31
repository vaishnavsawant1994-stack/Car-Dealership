import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { siteConfig } from '@/lib/constants/site'

function withDbTimeout<T>(promise: Promise<T>, ms = 600): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('DB Timeout')), ms)),
  ])
}

export async function GET() {
  // Never expose legacy seeded dealership contacts during client demos.
  if (process.env.APP_ENV !== 'commercial') {
    return NextResponse.json({ data: { settings: {}, showroom: null } })
  }
  try {
    const [settings, showroom] = await withDbTimeout(
      Promise.all([
        prisma.siteSetting.findMany({
          where: {
            key: {
              in: [
                'site_name',
                'site_tagline',
                'primary_phone',
                'support_phone',
                'sales_email',
                'support_email',
                'whatsapp',
                'inventory_location',
                'opening_hours',
                'facebook_url',
                'instagram_url',
                'youtube_url',
                'linkedin_url',
              ],
            },
          },
        }),
        prisma.showroom.findFirst({
          where: { active: true },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        }),
      ]),
      500
    )
    return NextResponse.json({
      data: {
        settings: Object.fromEntries(settings.map((item) => [item.key, item.value])),
        showroom,
      },
    })
  } catch {
    return NextResponse.json({
      data: {
        settings: {
          site_name: siteConfig.name,
          primary_phone: siteConfig.phone,
          support_phone: siteConfig.secondaryPhone,
          sales_email: siteConfig.email,
          support_email: siteConfig.secondaryEmail,
          whatsapp: siteConfig.whatsAppUrl,
          inventory_location: siteConfig.address,
          opening_hours: siteConfig.hours,
          facebook_url: siteConfig.facebook,
          instagram_url: siteConfig.instagram,
          youtube_url: siteConfig.youtube,
          linkedin_url: siteConfig.linkedin,
        },
        showroom: null,
      },
    })
  }
}
