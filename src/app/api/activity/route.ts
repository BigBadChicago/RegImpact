import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth.config'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    const page = Math.max(parseInt(searchParams.get('page') || '0'), 0)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)

    if (!customerId) {
      return NextResponse.json({ error: 'customerId required' }, { status: 400 })
    }

    // Fetch user to validate they belong to the requested customer
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { customerId: true }
    })

    if (!user || user.customerId !== customerId) {
      return NextResponse.json(
        { error: 'Forbidden: cannot access activity for different customer' },
        { status: 403 }
      )
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
