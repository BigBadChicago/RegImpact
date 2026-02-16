import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth.config'
import { prisma } from '@/lib/prisma'

// Fetch comments with pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const regulationId = searchParams.get('regulationId')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50) // ✅ Max 50 per page
    const page = Math.max(parseInt(searchParams.get('page') || '0'), 0)

    if (!regulationId) {
      return NextResponse.json(
        { error: 'regulationId required' },
        { status: 400 }
      )
    }

    // ✅ OPTIMIZATION 6: Explicit select + pagination
    const comments = await prisma.comment.findMany({
      where: {
        regulationId,
        parentId: null // Top-level comments only
      },
      select: {
        id: true,
        content: true,
        userId: true,
        user: { select: { id: true, name: true, email: true } },
        createdAt: true,
        editedAt: true,
        mentionedUserIds: true,
        replies: {
          select: {
            id: true,
            content: true,
            userId: true,
            user: { select: { id: true, name: true } },
            createdAt: true,
            mentionedUserIds: true
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: page * limit,
      take: limit
    })

    const total = await prisma.comment.count({
      where: { regulationId, parentId: null }
    })

    return NextResponse.json(
      {
        comments,
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
    console.error('[Comments GET Error]', error)
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    )
  }
}

// Create comment
export async function POST(request: NextRequest) {
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

    const {
      regulationId,
      content,
      parentId,
      mentionedUserIds = []
    } = await request.json()

    if (!regulationId || !content) {
      return NextResponse.json(
        { error: 'regulationId and content required' },
        { status: 400 }
      )
    }

    // Create comment with pre-extracted mentions ✅ OPTIMIZATION 4
    const comment = await prisma.comment.create({
      data: {
        regulationId,
        userId: user.id,
        content,
        parentId,
        mentionedUserIds
      },
      select: {
        id: true,
        content: true,
        userId: true,
        user: { select: { id: true, name: true } },
        createdAt: true
      }
    })

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    console.error('[Comments POST Error]', error)
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    )
  }
}
