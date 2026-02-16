import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth.config'
import { prisma } from '@/lib/prisma'

// Fetch approvals for a user
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const role = searchParams.get('role') // 'requester' or 'approver'

    // ✅ OPTIMIZATION 6: Explicit select to minimize response size
    const approvals = await prisma.approval.findMany({
      where:
        role === 'approver'
          ? { approverId: user!.id, status: status || undefined }
          : { requesterId: user!.id, status: status || undefined },
      select: {
        id: true,
        costEstimateId: true,
        status: true,
        requestNote: true,
        approverNote: true,
        createdAt: true,
        approvedAt: true,
        requester: { select: { id: true, name: true } },
        approver: { select: { id: true, name: true } },
        costEstimate: {
          select: {
            id: true,
            oneTimeCostLow: true,
            oneTimeCostHigh: true,
            recurringCostAnnual: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20 // ✅ OPTIMIZATION 8
    })

    return NextResponse.json({ approvals }, { status: 200 })
  } catch (error) {
    console.error('[Approvals GET Error]', error)
    return NextResponse.json(
      { error: 'Failed to fetch approvals' },
      { status: 500 }
    )
  }
}

// Request approval for cost estimate
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    const { costEstimateId, requestNote } = await request.json()

    if (!costEstimateId) {
      return NextResponse.json(
        { error: 'costEstimateId required' },
        { status: 400 }
      )
    }

    // Create approval request
    const approval = await prisma.approval.create({
      data: {
        costEstimateId,
        requesterId: user!.id,
        status: 'PENDING',
        requestNote
      },
      select: {
        id: true,
        status: true,
        createdAt: true
      }
    })

    return NextResponse.json(approval, { status: 201 })
  } catch (error) {
    console.error('[Approvals POST Error]', error)
    return NextResponse.json(
      { error: 'Failed to create approval request' },
      { status: 500 }
    )
  }
}
