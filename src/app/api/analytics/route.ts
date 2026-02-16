import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth.config'
import prisma from '@/lib/prisma'
import {
  calculateVelocity,
  calculateCostTrend,
  forecastRegulations,
  getHealthScoreHistory,
  calculateDepartmentMatrix,
  calculateGeoHeatMap
} from '@/lib/analytics/trends'
import { calculateHealthScore } from '@/lib/dashboard/metrics'
import { format } from 'date-fns'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Authenticate
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user and customer
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { customer: true }
    })

    if (!user?.customerId) {
      return NextResponse.json({ error: 'User not associated with a customer' }, { status: 403 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const period = parseInt(searchParams.get('period') || '12', 10) // months
    const dataType = searchParams.get('type') // specific data to fetch

    const customerId = user.customerId

    // Fetch requested analytics - specific type only
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

    // Return all analytics when no specific type is requested
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
