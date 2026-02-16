import prisma from '@/lib/prisma'
import { format, subMonths, addMonths } from 'date-fns'

export interface VelocityData {
  month: string
  count: number
  change: number // % change vs previous month
}

export interface CostTrendData {
  month: string
  totalCost: number
  rollingAverage: number
}

export interface ForecastResult {
  predictions: Array<{ month: string; predicted: number; confidence: number }>
  model: { slope: number; intercept: number; r2: number }
}

/**
 * Calculate regulatory velocity: number of new regulations detected per month
 */
export async function calculateVelocity(customerId: string, months: number = 12): Promise<VelocityData[]> {
  const startDate = subMonths(new Date(), months)

  // Get regulations detected in the timeframe
  const costEstimates = await prisma.costEstimate.findMany({
    where: {
      customerId,
      createdAt: { gte: startDate }
    },
    select: {
      createdAt: true,
      regulationVersion: {
        select: {
          regulation: {
            select: {
              id: true
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'asc' }
  })

  // Extract unique regulation IDs to avoid duplicates
  const regulationsByMonth = new Map<string, Set<string>>()

  costEstimates.forEach(est => {
    const monthKey = format(est.createdAt, 'yyyy-MM')
    const regId = est.regulationVersion.regulation.id

    if (!regulationsByMonth.has(monthKey)) {
      regulationsByMonth.set(monthKey, new Set())
    }
    regulationsByMonth.get(monthKey)!.add(regId)
  })

  // Convert to array with proper month generation
  const allMonths: string[] = []
  for (let i = months - 1; i >= 0; i--) {
    allMonths.push(format(subMonths(new Date(), i), 'yyyy-MM'))
  }

  return allMonths.map((month, idx) => {
    const count = regulationsByMonth.get(month)?.size || 0
    const prevCount = idx > 0 ? regulationsByMonth.get(allMonths[idx - 1])?.size || 0 : count
    const change = prevCount === 0 ? 0 : ((count - prevCount) / prevCount) * 100

    return {
      month,
      count,
      change
    }
  })
}

/**
 * Calculate cost trend with rolling 3-month average
 */
export async function calculateCostTrend(customerId: string, months: number = 12): Promise<CostTrendData[]> {
  const startDate = subMonths(new Date(), months)

  const estimates = await prisma.costEstimate.findMany({
    where: {
      customerId,
      createdAt: { gte: startDate }
    },
    select: {
      createdAt: true,
      oneTimeCostHigh: true,
      recurringCostAnnual: true
    },
    orderBy: { createdAt: 'asc' }
  })

  // Group by month
  const monthlyCosts = new Map<string, number>()
  estimates.forEach(est => {
    const monthKey = format(est.createdAt, 'yyyy-MM')
    const totalCost = est.oneTimeCostHigh + est.recurringCostAnnual
    monthlyCosts.set(monthKey, (monthlyCosts.get(monthKey) || 0) + totalCost)
  })

  // Generate all months in range
  const allMonths: string[] = []
  for (let i = months - 1; i >= 0; i--) {
    allMonths.push(format(subMonths(new Date(), i), 'yyyy-MM'))
  }

  // Calculate rolling 3-month average
  return allMonths.map((month, idx) => {
    const windowStart = Math.max(0, idx - 2)
    const window = allMonths.slice(windowStart, idx + 1)
    const windowCosts = window.map(m => monthlyCosts.get(m) || 0)
    const rollingAverage = windowCosts.reduce((sum, cost) => sum + cost, 0) / window.length

    return {
      month,
      totalCost: monthlyCosts.get(month) || 0,
      rollingAverage: Math.round(rollingAverage)
    }
  })
}

/**
 * Get historical compliance health scores
 */
export async function getHealthScoreHistory(customerId: string, months: number = 6) {
  const startDate = subMonths(new Date(), months)

  const history = await prisma.healthScoreHistory.findMany({
    where: {
      customerId,
      recordedAt: { gte: startDate }
    },
    orderBy: { recordedAt: 'asc' }
  })

  return history.map(h => ({
    month: format(h.recordedAt, 'yyyy-MM'),
    score: h.score
  }))
}

/**
 * Forecast future regulation counts using simple linear regression
 */
export function forecastRegulations(historical: VelocityData[], forecastMonths: number = 3): ForecastResult {
  const n = historical.length
  const x = historical.map((_, i) => i) // Month indices
  const y = historical.map(d => d.count)

  // Avoid division by zero
  if (n < 2) {
    return {
      predictions: [],
      model: { slope: 0, intercept: 0, r2: 0 }
    }
  }

  // Simple linear regression: y = mx + b
  const sumX = x.reduce((a, b) => a + b, 0)
  const sumY = y.reduce((a, b) => a + b, 0)
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0)
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0)

  const denominator = n * sumX2 - sumX * sumX
  if (denominator === 0) {
    return {
      predictions: [],
      model: { slope: 0, intercept: 0, r2: 0 }
    }
  }

  const slope = (n * sumXY - sumX * sumY) / denominator
  const intercept = (sumY - slope * sumX) / n

  // R-squared for confidence
  const yMean = sumY / n
  const ssTotal = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0)
  const ssResidual = y.reduce((sum, yi, i) => sum + Math.pow(yi - (slope * x[i] + intercept), 2), 0)
  const r2 = ssTotal === 0 ? 0 : 1 - (ssResidual / ssTotal)

  // Predict next N months
  const predictions = Array.from({ length: forecastMonths }, (_, offset) => {
    const futureOffset = offset + 1
    const xValue = n + futureOffset - 1
    const predicted = Math.round(Math.max(0, slope * xValue + intercept))

    // If r2 is negative, the model is unreliable, so use very low confidence
    const confidence = r2 < 0 ? 0 : Math.round(Math.min(100, r2 * 100))

    return {
      month: format(addMonths(new Date(), futureOffset), 'yyyy-MM'),
      predicted,
      confidence
    }
  })

  return {
    predictions,
    model: { slope, intercept, r2 }
  }
}

/**
 * Calculate department impact matrix data
 */
export async function calculateDepartmentMatrix(customerId: string) {
  interface DepartmentBreakdown {
    department: string
    hours: number
    cost: number
  }

  const costEstimates = await prisma.costEstimate.findMany({
    where: { customerId },
    select: {
      departmentBreakdown: true,
      oneTimeCostHigh: true,
      regulationVersion: {
        select: {
          regulation: {
            select: {
              regulationType: true
            }
          }
        }
      }
    }
  })

  // Build matrix: department x regulation type
  const matrix = new Map<string, Map<string, { count: number; cost: number; hours: number }>>()

  costEstimates.forEach(est => {
    const regulationType = est.regulationVersion.regulation.regulationType

    // Parse department breakdown if available with validation
    if (est.departmentBreakdown && typeof est.departmentBreakdown === 'object') {
      try {
        const breakdown = est.departmentBreakdown as unknown as Record<string, DepartmentBreakdown>
        Object.entries(breakdown).forEach(([_, deptData]) => {
          // Validate structure
          if (!deptData || typeof deptData !== 'object' || !deptData.department) {
            return // Skip invalid entries
          }
          
          const dept = deptData.department
          if (!matrix.has(dept)) {
            matrix.set(dept, new Map())
          }
          const deptMap = matrix.get(dept)!
          const existing = deptMap.get(regulationType) || { count: 0, cost: 0, hours: 0 }
          deptMap.set(regulationType, {
            count: existing.count + 1,
            cost: existing.cost + (est.oneTimeCostHigh || 0),
            hours: existing.hours + (deptData.hours || 0)
          })
        })
      } catch (error) {
        // Skip invalid breakdown data
        console.warn('Invalid department breakdown structure:', error)
      }
    }
  })

  // Convert to array format
  const result = []
  for (const [dept, typeMap] of matrix) {
    for (const [type, data] of typeMap) {
      result.push({
        department: dept,
        regulationType: type,
        impactScore: Math.min(100, (data.cost / 1000) + (data.hours / 10)),
        regulationCount: data.count,
        totalCost: data.cost,
        totalHours: data.hours
      })
    }
  }

  return result
}

/**
 * Calculate geographic heat map data by state
 */
export async function calculateGeoHeatMap(customerId: string) {
  // This would require regulations to have a jurisdiction field with state info
  // For now, returning a template structure
  const regulations = await prisma.costEstimate.findMany({
    where: { customerId },
    select: {
      oneTimeCostHigh: true,
      regulationVersion: {
        select: {
          regulation: {
            select: {
              jurisdiction: {
                select: {
                  code: true,
                  name: true
                }
              },
              regulationType: true
            }
          }
        }
      }
    }
  })

  // Build state-level aggregates
  const stateMap = new Map<
    string,
    { name: string; count: number; cost: number; types: Map<string, number> }
  >()

  regulations.forEach(est => {
    const jurisdiction = est.regulationVersion.regulation.jurisdiction
    const rawCode = (jurisdiction.code || '').toString()
    const stateCode = rawCode.toUpperCase().slice(0, 2)

    if (!stateMap.has(stateCode)) {
      stateMap.set(stateCode, {
        name: jurisdiction.name,
        count: 0,
        cost: 0,
        types: new Map()
      })
    }

    const state = stateMap.get(stateCode)!
    state.count += 1
    state.cost += est.oneTimeCostHigh || 0

    const typeCount = state.types.get(est.regulationVersion.regulation.regulationType) || 0
    state.types.set(est.regulationVersion.regulation.regulationType, typeCount + 1)
  })

  // Helper to get top regulation type
  const getTopType = (types: Map<string, number>): string => {
    if (types.size === 0) return 'N/A'
    const sortedTypes = Array.from(types.entries()).sort((a, b) => b[1] - a[1])
    return sortedTypes[0][0]
  }

  // Convert to result format
  return Array.from(stateMap).map(([code, data]) => ({
    stateName: data.name,
    stateCode: code,
    regulationCount: data.count,
    totalCost: data.cost,
    topRegulationType: getTopType(data.types)
  }))
}
