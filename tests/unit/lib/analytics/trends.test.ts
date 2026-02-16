import { describe, it, expect, vi } from 'vitest'
import { calculateVelocity, calculateCostTrend, forecastRegulations } from '@/lib/analytics/trends'
import prisma from '@/lib/prisma'
import { subMonths } from 'date-fns'

vi.mock('@/lib/prisma', () => ({
  default: {
    costEstimate: { findMany: vi.fn(), groupBy: vi.fn() }
  }
}))

describe('calculateVelocity', () => {
  it('should calculate monthly regulation counts', async () => {
    const mockData = [
      { createdAt: subMonths(new Date(), 2), regulationVersion: { regulation: { id: 'reg-1' } } },
      { createdAt: subMonths(new Date(), 2), regulationVersion: { regulation: { id: 'reg-2' } } },
      { createdAt: subMonths(new Date(), 1), regulationVersion: { regulation: { id: 'reg-3' } } }
    ]
    vi.mocked(prisma.costEstimate.findMany).mockResolvedValue(mockData as any)

    const result = await calculateVelocity('customer-1', 3)
    expect(result).toHaveLength(3)
    expect(result[0].month).toBeDefined()
    expect(result[0].count).toBeGreaterThanOrEqual(0)
  })

  it('should deduplicate regulations per month', async () => {
    const mockData = [
      { createdAt: subMonths(new Date(), 1), regulationVersion: { regulation: { id: 'reg-1' } } },
      { createdAt: subMonths(new Date(), 1), regulationVersion: { regulation: { id: 'reg-1' } } }
    ]
    vi.mocked(prisma.costEstimate.findMany).mockResolvedValue(mockData as any)

    const result = await calculateVelocity('customer-1', 2)
    const lastMonth = result[result.length - 2]
    expect(lastMonth.count).toBe(1)
  })

  it('should calculate percentage change', async () => {
    vi.mocked(prisma.costEstimate.findMany).mockResolvedValue([
      { createdAt: subMonths(new Date(), 2), regulationVersion: { regulation: { id: 'reg-1' } } },
      { createdAt: subMonths(new Date(), 1), regulationVersion: { regulation: { id: 'reg-2' } } },
      { createdAt: subMonths(new Date(), 1), regulationVersion: { regulation: { id: 'reg-3' } } }
    ] as any)

    const result = await calculateVelocity('customer-1', 3)
    expect(result[2].change).toBeDefined()
  })

  it('should handle empty data', async () => {
    vi.mocked(prisma.costEstimate.findMany).mockResolvedValue([])
    const result = await calculateVelocity('customer-1', 6)
    expect(result).toHaveLength(6)
    expect(result.every(r => r.count === 0)).toBe(true)
  })

  it('should filter by customerId', async () => {
    vi.mocked(prisma.costEstimate.findMany).mockResolvedValue([])
    await calculateVelocity('customer-123', 12)
    expect(prisma.costEstimate.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ customerId: 'customer-123' })
    }))
  })
})

describe('calculateCostTrend', () => {
  it('should calculate monthly cost totals', async () => {
    vi.mocked(prisma.costEstimate.findMany).mockResolvedValue([
      { createdAt: subMonths(new Date(), 1), oneTimeCostLow: 10000, oneTimeCostHigh: 15000, recurringCostAnnual: 5000 }
    ] as any)

    const result = await calculateCostTrend('customer-1', 3)
    expect(result).toHaveLength(3)
    expect(result[0].totalCost).toBeGreaterThanOrEqual(0)
    expect(result[0].rollingAverage).toBeGreaterThanOrEqual(0)
  })

  it('should calculate rolling average', async () => {
    vi.mocked(prisma.costEstimate.findMany).mockResolvedValue([
      { createdAt: subMonths(new Date(), 2), oneTimeCostLow: 10000, oneTimeCostHigh: 15000, recurringCostAnnual: 5000 },
      { createdAt: subMonths(new Date(), 1), oneTimeCostLow: 20000, oneTimeCostHigh: 25000, recurringCostAnnual: 8000 }
    ] as any)

    const result = await calculateCostTrend('customer-1', 3)
    const lastMonth = result[result.length - 2]
    expect(lastMonth.rollingAverage).toBeGreaterThan(0)
  })
})

describe('forecastRegulations', () => {
  it('should generate predictions', () => {
    const velocity = [
      { month: '2026-01', count: 5, change: 0 },
      { month: '2026-02', count: 6, change: 20 },
      { month: '2026-03', count: 7, change: 16.7 }
    ]
    const result = forecastRegulations(velocity, 2)
    expect(result.predictions).toHaveLength(2)
    expect(result.model.slope).toBeDefined()
  })

  it('should include confidence intervals', () => {
    const velocity = [
      { month: '2026-01', count: 5, change: 0 },
      { month: '2026-02', count: 6, change: 20 }
    ]
    const result = forecastRegulations(velocity, 1)
    expect(result.predictions).toHaveLength(1)
    expect(result.predictions[0].confidence).toBeGreaterThanOrEqual(0)
    expect(result.predictions[0].confidence).toBeLessThanOrEqual(100)
  })
})
