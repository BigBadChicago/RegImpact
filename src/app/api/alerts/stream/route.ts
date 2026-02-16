import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth.config'
import { prisma } from '@/lib/prisma'

/**
 * Server-Sent Events stream for real-time alerts
 * Replaces polling (30s interval) with push-based updates
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, customerId: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Set up SSE headers
    const headers = {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }

    const stream = new ReadableStream({
      async start(controller) {
        // Send initial list of unread alerts
        const unreadAlerts = await prisma.alert.findMany({
          where: {
            customerId: user.customerId,
            read: false,
            dismissed: false
          },
          select: {
            id: true,
            type: true,
            category: true,
            title: true,
            message: true,
            actionUrl: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 20
        })

        for (const alert of unreadAlerts) {
          controller.enqueue(
            `data: ${JSON.stringify(alert)}\n\n`.repeat(1)
          )
        }

        // Keep connection alive with ping every 30 seconds
        const pingInterval = setInterval(() => {
          try {
            controller.enqueue('data: ping\n\n')
          } catch {
            clearInterval(pingInterval)
            controller.close()
          }
        }, 30000)

        // Cleanup on connection close
        return () => clearInterval(pingInterval)
      }
    })

    return new NextResponse(stream, { headers })
  } catch (error) {
    console.error('[Alerts Stream Error]', error)
    return NextResponse.json(
      { error: 'Failed to establish alert stream' },
      { status: 500 }
    )
  }
}

/**
 * Fallback polling endpoint if SSE is unavailable
 * This endpoint is hit every 60 seconds as a fallback
 */
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

    // ✅ OPTIMIZATION 6: Only select necessary fields
    const alerts = await prisma.alert.findMany({
      where: {
        customerId: user!.customerId,
        dismissed: false
      },
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
      take: 20  // ✅ OPTIMIZATION 8: Explicit limit
    })

    return NextResponse.json({ alerts }, { status: 200 })
  } catch (error) {
    console.error('[Alerts Polling Error]', error)
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    )
  }
}
