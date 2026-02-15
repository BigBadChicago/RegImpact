import { prisma } from '@/lib/prisma'
import { ComplianceHealthScore } from '@/types/dashboard-enhanced'

export async function calculateComplianceHealthScore(customerId: string): Promise<ComplianceHealthScore> {
  // Fetch data
  const deadlines = await prisma.deadline.findMany({
    where: {
      regulationVersion: {
        regulation: {
          status: 'ACTIVE'
        }
      }
    },
    include: {
      regulationVersion: {
        include: {
          regulation: true
        }
      }
    }
  })
  
  const costEstimates = await prisma.costEstimate.findMany({
    where: { customerId }
  })

  // 1. Deadline Adherence (40% weight)
  // Logic: (met deadlines / total deadlines) × 100
  const totalDeadlines = deadlines.length
  const metDeadlines = deadlines.filter(d => d.notificationSent && new Date(d.deadlineDate) > new Date()).length
  const deadlineAdherence = totalDeadlines > 0 ? (metDeadlines / totalDeadlines) * 100 : 100

  // 2. Cost Predictability (40% weight)
  // Logic: Calculated based on variance between low and high estimates
  // Higher score = more predictable (smaller range)
  let costPredictability = 80  // Default score
  if (costEstimates.length > 0) {
    const avgVariance = costEstimates.reduce((sum, est) => {
      const variance = (est.oneTimeCostHigh - est.oneTimeCostLow) / est.oneTimeCostHigh
      return sum + Math.abs(variance)
    }, 0) / costEstimates.length
    costPredictability = Math.max(0, 100 - (avgVariance * 100))
  }

  // 3. Risk Exposure Inverse (20% weight)
  // Logic: Lower exposure = higher score
  const totalExposure = costEstimates.reduce((sum, e) => sum + e.oneTimeCostHigh + e.recurringCostAnnual, 0)
  const riskExposureInverse = Math.max(0, 100 - Math.min(100, totalExposure / 10000))  // $1M = 0 score

  // Combined score: weighted average
  const score = Math.round(
    deadlineAdherence * 0.4 +
    costPredictability * 0.4 +
    riskExposureInverse * 0.2
  )

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
    industryBenchmark: 75  // Mock benchmark
  }
}
