import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth.config'
import { prisma } from '@/lib/prisma'
import {
  calculateVelocity,
  calculateCostTrend,
  forecastRegulations,
  getHealthScoreHistory,
  calculateDepartmentMatrix,
  calculateGeoHeatMap
} from '@/lib/analytics/trends'
import { calculateHealthScore } from '@/lib/dashboard/metrics'
import dayjs from 'dayjs'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { customer: true }
    })

    if (!user?.customerId) {
      return NextResponse.json({ error: 'User not associated with a customer' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const period = parseInt(searchParams.get('period') || '12', 10)
    const dataType = searchParams.get('type')

    const customerId = user.customerId

    if (dataType === 'velocity') {
      const velocity = await calculateVelocity(customerId, period)
      return NextResponse.json({ velocity })
    }

    if (dataType === 'costTrend') {
      const costTrend = await calculateCostTrend(customerId, period)
      return NextResponse.json({ costTrend })
    }

    if (dataType === 'forecast') {
      const velocity = await calculateVelocity(customerId, Math.min(12, period))
      const forecast = forecastRegulations(velocity, 3)
      return NextResponse.json({ forecast })
    }

    if (dataType === 'healthScore') {
      const healthScoreComponents = await calculateHealthScore(customerId)
      const healthScores = await getHealthScoreHistory(customerId, 6)
      const currentScore = Math.round(
        (healthScoreComponents.deadlineAdherence * 0.4 +
          healthScoreComponents.costPredictability * 0.4 +
          healthScoreComponents.riskExposure * 0.2) *
          1
      )
      return NextResponse.json({
        current: currentScore,
        history: healthScores
      })
    }

    if (dataType === 'departmentMatrix') {
      const matrix = await calculateDepartmentMatrix(customerId)
      return NextResponse.json({ matrix })
    }

    if (dataType === 'geoMap') {
      const geoData = await calculateGeoHeatMap(customerId)
      return NextResponse.json({ geoData })
    }

    const [velocity, costTrend, healthScoreComponents, healthScores, matrix, geoData] = await Promise.all([
      calculateVelocity(customerId, period),
      calculateCostTrend(customerId, period),
      calculateHealthScore(customerId),
      getHealthScoreHistory(customerId, 6),
      calculateDepartmentMatrix(customerId),
      calculateGeoHeatMap(customerId)
    ])

    const forecast = forecastRegulations(velocity, 3)
    const currentScore = Math.round(
      (healthScoreComponents.deadlineAdherence * 0.4 +
        healthScoreComponents.costPredictability * 0.4 +
        healthScoreComponents.riskExposure * 0.2) *
        1
    )

    return NextResponse.json({
      velocity,
      costTrend,
      forecast,
      healthScore: {
        current: currentScore,
        history: healthScores
      },
      departmentMatrix: matrix,
      geoHeatMap: geoData,
      timestamp: format(new Date(), 'yyyy-MM-dd HH:mm:ss')
    })
  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}

/**
 * Analytics event logging (lightweight placeholder)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[Analytics]', body)
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('[Analytics Error]', error)
    return NextResponse.json(
      { error: 'Failed to log analytics event' },
      { status: 500 }
    )
  }
}
