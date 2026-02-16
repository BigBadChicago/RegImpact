import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth.config'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { customerId: true }
    })

    // ✅ OPTIMIZATION 6 & 8: Explicit select + limit
    const alerts = await prisma.alert.findMany({
      where: { customerId: user!.customerId, dismissed: false },
      select: {
        id: true,
        type: true,
        category: true,
        title: true,
        message: true,
        read: true,
        actionUrl: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    return NextResponse.json({ alerts }, { status: 200 })
  } catch (error) {
    console.error('[Alerts Error]', error)
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { customerId: true }
    })

    const { type, category, title, message, regulationId, actionUrl } = await request.json()

    const alert = await prisma.alert.create({
      data: {
        customerId: user!.customerId,
        type,
        category,
        title,
        message,
        regulationId,
        actionUrl
      }
    })

    return NextResponse.json(alert, { status: 201 })
  } catch (error) {
    console.error('[Alert Create Error]', error)
    return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 })
  }
}
