import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth.config'
import { prisma } from '@/lib/prisma'

interface BatchAction {
  type: 'comment' | 'approval' | 'activity' | 'alert'
  payload: Record<string, any>
}

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

    const { actions } = await request.json()

    if (!Array.isArray(actions)) {
      return NextResponse.json(
        { error: 'Actions must be an array' },
        { status: 400 }
      )
    }

    // Process all actions in a transaction for atomicity
    const results = await prisma.$transaction(
      actions.map((action: BatchAction) => {
        switch (action.type) {
          case 'comment':
            return prisma.comment.create({
              data: {
                regulationId: action.payload.regulationId,
                userId: user.id,
                content: action.payload.content,
                parentId: action.payload.parentId,
                mentionedUserIds: action.payload.mentionedUserIds || []
              }
            })

          case 'activity':
            return prisma.activity.create({
              data: {
                customerId: user.customerId,
                userId: user.id,
                type: action.payload.type,
                entityType: action.payload.entityType,
                entityId: action.payload.entityId,
                description: action.payload.description,
                metadata: action.payload.metadata
              }
            })

          case 'approval':
            return prisma.approval.create({
              data: {
                costEstimateId: action.payload.costEstimateId,
                requesterId: user.id,
                status: action.payload.status || 'PENDING',
                requestNote: action.payload.requestNote,
                approverNote: action.payload.approverNote
              }
            })

          case 'alert':
            return prisma.alert.create({
              data: {
                customerId: user.customerId,
                type: action.payload.type,
                category: action.payload.category,
                title: action.payload.title,
                message: action.payload.message,
                regulationId: action.payload.regulationId,
                actionUrl: action.payload.actionUrl
              }
            })

          default:
            throw new Error(`Unknown action type: ${action.type}`)
        }
      })
    )

    return NextResponse.json(
      { success: true, results, count: results.length },
      { status: 200 }
    )
  } catch (error) {
    console.error('[Batch Actions Error]', error)
    return NextResponse.json(
      { error: 'Failed to process batch actions' },
      { status: 500 }
    )
  }
}
