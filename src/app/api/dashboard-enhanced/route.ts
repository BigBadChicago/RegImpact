import { NextResponse } from 'next/server'
import { auth } from '@/auth.config'
import { calculateComplianceHealthScore } from '@/lib/metrics/compliance-score'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const customerId = session.user.customerId
  if (!customerId) {
    return NextResponse.json({ error: 'Customer ID not found' }, { status: 400 })
  }

  try {
    // Health score
    const healthScore = await calculateComplianceHealthScore(customerId)

    // Cost waterfall data
    const costEstimates = await prisma.costEstimate.findMany({
      where: { customerId },
      include: { 
        regulationVersion: { 
          include: { 
            regulation: true 
          } 
        } 
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    const totalExposure = costEstimates.reduce((sum, e) => sum + e.oneTimeCostHigh + e.recurringCostAnnual, 0)

    const waterfall = {
      starting: totalExposure,
      additions: costEstimates.slice(0, 5).map(e => ({
        name: e.regulationVersion.regulation.title,
        value: e.oneTimeCostHigh,
        regulationId: e.regulationVersion.regulationId
      })),
      reductions: [],  // Implement when tracking completed regulations
      ending: totalExposure
    }

    // Timeline regulations
    const oneYearFromNow = new Date()
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1)

    // Get regulation version IDs that the customer is tracking
    const customerRegulationVersionIds = costEstimates.map(ce => ce.regulationVersionId)

    const deadlines = await prisma.deadline.findMany({
      where: {
        deadlineDate: { 
          gte: new Date(), 
          lte: oneYearFromNow
        },
        regulationVersionId: {
          in: customerRegulationVersionIds  // Tenant isolation
        }
      },
      include: {
        regulationVersion: {
          include: {
            regulation: { 
              include: { 
                jurisdiction: true 
              } 
            },
            costEstimates: { 
              where: { customerId }, 
              take: 1 
            }
          }
        }
      },
      orderBy: { deadlineDate: 'asc' }
    })

    const timelineRegulations = deadlines
      .filter(d => d.regulationVersion.regulation.status === 'ACTIVE')
      .map(d => ({
        id: d.regulationVersion.regulationId,
        title: d.regulationVersion.regulation.title,
        deadline: d.deadlineDate.toISOString(),  // Convert to ISO string for JSON serialization
        cost: d.regulationVersion.costEstimates[0]?.oneTimeCostHigh || 0,
        riskLevel: d.riskLevel || 'ROUTINE',
        department: 'Legal',  // Derive from cost estimate department breakdown when available
        jurisdiction: d.regulationVersion.regulation.jurisdiction.code
      }))

    return NextResponse.json({
      healthScore,
      costWaterfall: waterfall,
      timelineRegulations
    })
  } catch (error) {
    console.error('Error fetching enhanced dashboard data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' }, 
      { status: 500 }
    )
  }
}
