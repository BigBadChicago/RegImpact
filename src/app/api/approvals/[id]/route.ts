import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth.config'
import { prisma } from '@/lib/prisma'
import { sendApprovalEmail } from '@/lib/email/approval-notifications'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, name: true }
    })

    const { status, approverNote } = await request.json()

    if (!['APPROVED', 'REJECTED', 'CANCELLED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Fetch approval with related data to send email
    const approval = await prisma.approval.findUnique({
      where: { id: params.id },
      select: {
        costEstimate: {
          select: {
            oneTimeCostLow: true,
            oneTimeCostHigh: true,
            recurringCostAnnual: true,
            regulationVersion: {
              select: {
                regulation: { select: { id: true, title: true } }
              }
            }
          }
        },
        requester: { select: { email: true } }
      }
    })

    if (!approval) {
      return NextResponse.json({ error: 'Approval not found' }, { status: 404 })
    }

    // Update approval
    const updatedApproval = await prisma.approval.update({
      where: { id: params.id },
      data: {
        status,
        approverNote,
        approverId: user!.id,
        approvedAt: new Date()
      },
      select: {
        id: true,
        status: true,
        approvedAt: true
      }
    })

    // Send email notification asynchronously
    if (['APPROVED', 'REJECTED'].includes(status)) {
      const estimatedCost =
        (approval.costEstimate.oneTimeCostLow + approval.costEstimate.oneTimeCostHigh) / 2 +
        approval.costEstimate.recurringCostAnnual

      sendApprovalEmail({
        approverName: user!.name || 'Administrator',
        regulationTitle: approval.costEstimate.regulationVersion.regulation.title,
        costEstimate: estimatedCost,
        status: status as 'APPROVED' | 'REJECTED',
        approverNote,
        requesterEmail: approval.requester.email,
        approvalLink: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard/regulations/${approval.costEstimate.regulationVersion.regulation.id}`
      }).catch(error => {
        console.error('[Email Send Error - Non-blocking]', error)
        // Don't throw - email is nice to have but approval is critical
      })
    }

    return NextResponse.json(updatedApproval, { status: 200 })
  } catch (error) {
    console.error('[Approval Update Error]', error)
    return NextResponse.json({ error: 'Failed to update approval' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.approval.update({
      where: { id: params.id },
      data: { status: 'CANCELLED' }
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('[Approval Delete Error]', error)
    return NextResponse.json({ error: 'Failed to cancel approval' }, { status: 500 })
  }
}
