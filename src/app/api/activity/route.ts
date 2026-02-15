import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    const page = Math.max(parseInt(searchParams.get('page') || '0'), 0)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)

    if (!customerId) {
      return NextResponse.json({ error: 'customerId required' }, { status: 400 })
    }

    // ✅ OPTIMIZATION 6 & 8: Explicit select + pagination
    const activities = await prisma.activity.findMany({
      where: { customerId },
      select: {
        id: true,
        type: true,
        description: true,
        user: { select: { name: true } },
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      skip: page * limit,
      take: limit
    })

    const total = await prisma.activity.count({ where: { customerId } })

    return NextResponse.json(
      {
        activities,
        pagination: {
          total,
          page,
          limit,
          hasMore: (page + 1) * limit < total
        }
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[Activity Error]', error)
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 })
  }
}
