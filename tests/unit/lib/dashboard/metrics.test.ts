import { describe, it, expect, vi } from 'vitest'
import { calculateHealthScoreComponents, calculateHealthScore } from '@/lib/dashboard/metrics'
import { prisma } from '@/lib/prisma'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    costEstimate: { findMany: vi.fn() },
    deadline: { findMany: vi.fn() }
  }
}))

describe('calculateHealthScoreComponents', () => {
  it('should calculate deadline adherence correctly', () => {
    const input = {
      costEstimates: [],
      deadlines: [
        { deadlineDate: new Date('2026-12-31'), notificationSent: true },
        { deadlineDate: new Date('2026-12-31'), notificationSent: false },
        { deadlineDate: new Date('2025-01-01'), notificationSent: true }
      ]
    }
    const result = calculateHealthScoreComponents(input)
    expect(result.deadlineAdherence).toBeGreaterThan(0)
    expect(result.deadlineAdherence).toBeLessThanOrEqual(100)
  })

  it('should calculate cost predictability correctly', () => {
    const input = {
      costEstimates: [
        { oneTimeCostLow: 10000, oneTimeCostHigh: 12000, recurringCostAnnual: 5000 },
        { oneTimeCostLow: 20000, oneTimeCostHigh: 22000, recurringCostAnnual: 8000 }
      ],
      deadlines: []
    }
    const result = calculateHealthScoreComponents(input)
    expect(result.costPredictability).toBeGreaterThan(80)
    expect(result.costPredictability).toBeLessThanOrEqual(100)
  })

  it('should calculate risk exposure correctly', () => {
    const input = {
      costEstimates: [
        { oneTimeCostLow: 50000, oneTimeCostHigh: 100000, recurringCostAnnual: 20000 }
      ],
      deadlines: []
    }
    const result = calculateHealthScoreComponents(input)
    expect(result.riskExposure).toBeGreaterThan(0)
    expect(result.riskExposure).toBeLessThanOrEqual(100)
  })

  it('should return 100% for empty data', () => {
    const input = { costEstimates: [], deadlines: [] }
    const result = calculateHealthScoreComponents(input)
    expect(result.deadlineAdherence).toBe(100)
    expect(result.costPredictability).toBe(100)
  })

  it('should include weights', () => {
    const input = { costEstimates: [], deadlines: [] }
    const result = calculateHealthScoreComponents(input)
    expect(result.weights.deadlineAdherence).toBe(0.4)
    expect(result.weights.costPredictability).toBe(0.4)
    expect(result.weights.riskExposure).toBe(0.2)
  })

  it('should round to one decimal', () => {
    const input = {
      costEstimates: [{ oneTimeCostLow: 10000, oneTimeCostHigh: 10100, recurringCostAnnual: 5000 }],
      deadlines: [{ deadlineDate: new Date('2026-12-31'), notificationSent: true }]
    }
    const result = calculateHealthScoreComponents(input)
    expect(result.costPredictability % 1).toBeLessThanOrEqual(0.1)
  })
})

describe('calculateHealthScore', () => {
  it('should fetch customer data and calculate score', async () => {
    vi.mocked(prisma.costEstimate.findMany).mockResolvedValue([
      { oneTimeCostLow: 10000, oneTimeCostHigh: 12000, recurringCostAnnual: 5000, regulationVersionId: 'v1' }
    ] as any)
    vi.mocked(prisma.deadline.findMany).mockResolvedValue([
      { deadlineDate: new Date('2026-12-31'), notificationSent: true }
    ] as any)

    const result = await calculateHealthScore('customer-1')
    expect(result.deadlineAdherence).toBeDefined()
    expect(result.costPredictability).toBeDefined()
    expect(result.riskExposure).toBeDefined()
  })

  it('should filter by customerId', async () => {
    vi.mocked(prisma.costEstimate.findMany).mockResolvedValue([])
    vi.mocked(prisma.deadline.findMany).mockResolvedValue([])

    await calculateHealthScore('customer-123')
    expect(prisma.costEstimate.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { customerId: 'customer-123' }
    }))
  })
})
