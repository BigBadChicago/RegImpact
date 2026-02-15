import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth.config'
import { calculateHealthScore, computeHealthScore, calculateHealthScoreTrend } from '@/lib/dashboard/metrics'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/dashboard/metrics
 * Returns comprehensive dashboard metrics for authenticated user's customer
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user and customer
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { customer: true }
    })

    if (!user?.customerId) {
      return NextResponse.json(
        { error: 'User not associated with a customer' },
        { status: 403 }
      )
    }

    const customerId = user.customerId
    const customer = user.customer

    // Calculate health score components
    const components = await calculateHealthScore(customerId)
    const healthScore = computeHealthScore(components)
    const trend = await calculateHealthScoreTrend(customerId)

    // Get cost exposure data
    const costEstimates = await prisma.costEstimate.findMany({
      where: { customerId },
      select: {
        oneTimeCostHigh: true,
        recurringCostAnnual: true,
        createdAt: true
      }
    })

    const totalCostExposure = costEstimates.reduce(
      (sum, e) => sum + e.oneTimeCostHigh + e.recurringCostAnnual * 3,
      0
    )

    // Calculate cost trend (mock - compare to 30 days ago)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentEstimates = costEstimates.filter(e => e.createdAt > thirtyDaysAgo)
    const costTrend = costEstimates.length > 0 ? (recentEstimates.length / costEstimates.length) * 5 : 0

    // Get regulation and deadline counts
    const regulationVersionIds = (
      await prisma.costEstimate.findMany({
        where: { customerId },
        select: { regulationVersionId: true }
      })
    ).map(e => e.regulationVersionId)

    const regulationCount = await prisma.regulation.count({
      where: {
        versions: {
          some: { id: { in: regulationVersionIds } }
        },
        status: 'ACTIVE'
      }
    })

    // Get upcoming deadlines (next 30 days)
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

    const upcomingDeadlines = await prisma.deadline.count({
      where: {
        regulationVersionId: { in: regulationVersionIds },
        deadlineDate: {
          gte: new Date(),
          lte: thirtyDaysFromNow
        }
      }
    })

    // Health score trend calculation
    let healthTrend = 0
    if (trend.length >= 2) {
      const currentScore = trend[trend.length - 1].score
      const previousScore = trend[trend.length - 2].score
      healthTrend = previousScore > 0 ? ((currentScore - previousScore) / previousScore) * 100 : 0
    }

    const metrics = {
      healthScore,
      healthTrend: Math.round(healthTrend * 10) / 10,
      totalCostExposure,
      costTrend: Math.round(costTrend * 10) / 10,
      regulationCount,
      upcomingDeadlines,
      components
    }

    return NextResponse.json(metrics)
  } catch (error) {
    console.error('[Dashboard Metrics API Error]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
