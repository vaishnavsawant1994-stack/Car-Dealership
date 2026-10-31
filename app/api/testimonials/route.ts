import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

function withDbTimeout<T>(promise: Promise<T>, ms = 600): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('DB Timeout')), ms)),
  ])
}

export async function GET() {
  try {
    const data = await withDbTimeout(
      prisma.testimonial.findMany({
        where: { published: true, archived: false },
        orderBy: [{ featured: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
      }),
      500
    )
    return NextResponse.json({
      data: data.map((item) => ({
        id: item.id,
        name: item.name,
        quote: item.quote,
        purchase: item.purchase || 'Car Dealership Demo customer',
        location: item.location || 'Pune',
        avatar: item.avatarUrl || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=85',
        rating: item.rating,
        verifiedBuyer: item.verifiedBuyer,
      })),
    })
  } catch {
    return NextResponse.json({ data: [], available: false })
  }
}
