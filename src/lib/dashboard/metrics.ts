import { prisma } from '@/lib/prisma'
import { HealthScoreComponents } from '@/types/dashboard'

/**
 * Input data structure for health score calculation
 */
type HealthScoreInput = {
  costEstimates: Array<{
    oneTimeCostLow: number
    oneTimeCostHigh: number
    recurringCostAnnual: number
  }>
  deadlines: Array<{
    deadlineDate: Date | string
    notificationSent: boolean
  }>
}

/**
 * Pure calculation function: computes health score components from raw data
 * No database access, fully testable
 */
export function calculateHealthScoreComponents(input: HealthScoreInput): HealthScoreComponents {
  const { costEstimates, deadlines } = input

  // Deadline adherence: % of deadlines with notifications sent before due date
  const totalDeadlines = deadlines.length
  const adheredDeadlines = deadlines.filter(d => {
    const dueDate = new Date(d.deadlineDate)
    const today = new Date()
    return d.notificationSent && dueDate > today
  }).length

  const deadlineAdherence = totalDeadlines > 0 ? (adheredDeadlines / totalDeadlines) * 100 : 100

  // Cost predictability: 1 - avg(variance % between low and high estimates)
  const costVariances = costEstimates.map(e => {
    if (e.oneTimeCostHigh === 0) return 0
    return Math.abs(e.oneTimeCostHigh - e.oneTimeCostLow) / e.oneTimeCostHigh
  })

  const avgVariance = costVariances.length > 0 ? costVariances.reduce((a, b) => a + b, 0) / costVariances.length : 0
  const costPredictability = Math.max(0, (1 - avgVariance) * 100)

  // Risk exposure: Inverse of total cost exposure
  // Total exposure divided by maximum acceptable exposure ($5M)
  const totalExposure = costEstimates.reduce(
    (sum, e) => sum + e.oneTimeCostHigh + e.recurringCostAnnual * 3, // 3-year projection
    0
  )

  const maxExposure = 5000000
  const riskExposure = Math.max(0, 100 - (totalExposure / maxExposure) * 100)

  return {
    deadlineAdherence: Math.round(deadlineAdherence * 10) / 10,
    costPredictability: Math.round(costPredictability * 10) / 10,
    riskExposure: Math.round(riskExposure * 10) / 10,
    weights: {
      deadlineAdherence: 0.4,
      costPredictability: 0.4,
      riskExposure: 0.2
    }
  }
}

/**
 * Calculate compliance health score components for a customer
 * Fetches data from database and delegates to pure calculation function
 */
export async function calculateHealthScore(customerId: string): Promise<HealthScoreComponents> {
  // Fetch regulations associated with customer through cost estimates
  const costEstimates = await prisma.costEstimate.findMany({
    where: { customerId },
    select: {
      oneTimeCostLow: true,
      oneTimeCostHigh: true,
      recurringCostAnnual: true,
      regulationVersionId: true
    }
  })

  const regulationVersionIds = costEstimates.map(ce => ce.regulationVersionId)

  // Deadline adherence: % of deadlines with notifications sent before due date
  const deadlines = await prisma.deadline.findMany({
    where: {
      regulationVersionId: { in: regulationVersionIds }
    },
    select: {
      deadlineDate: true,
      notificationSent: true
    }
  })

  return calculateHealthScoreComponents({
    costEstimates,
    deadlines
  })
}

/**
 * Compute final weighted health score from components
 */
export function computeHealthScore(components: HealthScoreComponents): number {
  const { deadlineAdherence, costPredictability, riskExposure, weights } = components
  const score =
    deadlineAdherence * weights.deadlineAdherence +
    costPredictability * weights.costPredictability +
    riskExposure * weights.riskExposure

  return Math.round(score)
}

/**
 * Generate mock health score trend based on current score
 * To be replaced with real historical data when available
 */
export function mockHealthScoreTrend(currentScore: number): Array<{ month: string; score: number }> {
  const baseScore = Math.max(0, currentScore - 5)

  return [
    { month: 'Month -2', score: Math.max(0, baseScore - 3) },
    { month: 'Month -1', score: baseScore },
    { month: 'Current', score: currentScore }
  ]
}

/**
 * Calculate health score trend (3-month historical)
 * Wrapper that calculates current score and calls mockHealthScoreTrend
 * TODO: Replace with real historical data when available
 */
export async function calculateHealthScoreTrend(customerId: string): Promise<Array<{ month: string; score: number }>> {
  const components = await calculateHealthScore(customerId)
  const currentScore = computeHealthScore(components)
  return mockHealthScoreTrend(currentScore)
}
