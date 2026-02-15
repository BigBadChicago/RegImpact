import { prisma } from '@/lib/prisma'
import { ComplianceHealthScore } from '@/types/dashboard-enhanced'

// Pure helper functions for testability
function computeDeadlineAdherence(deadlines: Array<{
  notificationSent: boolean
  deadlineDate: Date | string
}>): number {
  const total = deadlines.length
  const met = deadlines.filter(
    d => d.notificationSent && new Date(d.deadlineDate) > new Date()
  ).length
  return total > 0 ? (met / total) * 100 : 100
}

function computeCostPredictability(costEstimates: Array<{
  oneTimeCostLow: number
  oneTimeCostHigh: number
}>): number {
  if (costEstimates.length === 0) return 80 // Default score
  const avgVariance = costEstimates.reduce((sum, est) => {
    const variance = (est.oneTimeCostHigh - est.oneTimeCostLow) / est.oneTimeCostHigh
    return sum + Math.abs(variance)
  }, 0) / costEstimates.length
  return Math.max(0, 100 - avgVariance * 100)
}

function computeRiskExposureInverse(costEstimates: Array<{
  oneTimeCostHigh: number
  recurringCostAnnual: number
}>): number {
  const totalExposure = costEstimates.reduce(
    (sum, e) => sum + e.oneTimeCostHigh + e.recurringCostAnnual,
    0
  )
  return Math.max(0, 100 - Math.min(100, totalExposure / 10000)) // $1M = 0 score
}

function combineComplianceScore(components: {
  deadlineAdherence: number
  costPredictability: number
  riskExposureInverse: number
}): number {
  return Math.round(
    components.deadlineAdherence * 0.4 +
      components.costPredictability * 0.4 +
      components.riskExposureInverse * 0.2
  )
}

export async function calculateComplianceHealthScore(customerId: string): Promise<ComplianceHealthScore> {
  // Fetch customer's cost estimates first to get their regulation versions
  const costEstimates = await prisma.costEstimate.findMany({
    where: { customerId },
    select: { regulationVersionId: true, oneTimeCostLow: true, oneTimeCostHigh: true, recurringCostAnnual: true }
  })

  const regulationVersionIds = [...new Set(costEstimates.map(ce => ce.regulationVersionId))]

  // Fetch only deadlines for regulations the customer is tracking (tenant isolation)
  const deadlines = await prisma.deadline.findMany({
    where: {
      regulationVersionId: { in: regulationVersionIds },
      regulationVersion: {
        regulation: {
          status: 'ACTIVE'
        }
      }
    },
    select: {
      notificationSent: true,
      deadlineDate: true
    }
  })

  // Calculate metrics using pure functions
  const deadlineAdherence = computeDeadlineAdherence(deadlines)
  const costPredictability = computeCostPredictability(costEstimates)
  const riskExposureInverse = computeRiskExposureInverse(costEstimates)

  const score = combineComplianceScore({
    deadlineAdherence,
    costPredictability,
    riskExposureInverse
  })

  // 3-month trend (mock for now, implement with historical data)
  const trend = [
    { month: 'Month -2', score: Math.max(0, score - 5) },
    { month: 'Month -1', score: Math.max(0, score - 2) },
    { month: 'Current', score }
  ]

  return {
    score,
    components: { deadlineAdherence, costPredictability, riskExposureInverse },
    trend,
    industryBenchmark: 75 // Mock benchmark
  }
}
