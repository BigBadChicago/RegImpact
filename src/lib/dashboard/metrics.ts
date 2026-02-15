import { prisma } from '@/lib/prisma'
import { HealthScoreComponents } from '@/types/dashboard'

/**
 * Calculate compliance health score components for a customer
 * Breakdown: Deadline Adherence (40%) + Cost Predictability (40%) + Risk Exposure (20%)
 */
export async function calculateHealthScore(customerId: string): Promise<HealthScoreComponents> {
  // Fetch regulations associated with customer through cost estimates
  const costEstimates = await prisma.costEstimate.findMany({
    where: { customerId },
    include: {
      regulationVersion: {
        include: {
          regulation: true,
          deadline: true
        }
      }
    }
  })

  const regulationVersionIds = costEstimates.map(ce => ce.regulationVersionId)

  // Deadline adherence: % of deadlines with notifications sent before due date
  const deadlines = await prisma.deadline.findMany({
    where: {
      regulationVersionId: { in: regulationVersionIds }
    }
  })

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

  // Risk exposure: Inverse of high-cost regulation count
  // Total exposure divided by maximum acceptable exposure ($1M)
  const totalExposure = costEstimates.reduce(
    (sum, e) => sum + e.oneTimeCostHigh + e.recurringCostAnnual * 3, // 3-year projection
    0
  )

  // Scale: 100 at $0, 0 at $5M+
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
 * Calculate health score trend (3-month historical)
 * Returns array of score trend points
 */
export async function calculateHealthScoreTrend(customerId: string): Promise<Array<{ month: string; score: number }>> {
  // TODO: Implement with historical data storage
  // For now, return mock trend based on current score
  const components = await calculateHealthScore(customerId)
  const currentScore = computeHealthScore(components)

  const baseScore = Math.max(0, currentScore - 5)

  return [
    { month: 'Month -2', score: Math.max(0, baseScore - 3) },
    { month: 'Month -1', score: baseScore },
    { month: 'Current', score: currentScore }
  ]
}
