import { describe, it, expect, vi } from 'vitest'
import { getHealthScoreFromCache, cacheHealthScore, invalidateHealthScoreCache } from '@/lib/cache/health-score'
import { prisma } from '@/lib/prisma'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    healthScoreCache: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn()
    }
  }
}))

describe('getHealthScoreFromCache', () => {
  it('should return cached score if valid', async () => {
    const futureDate = new Date(Date.now() + 3600000)
    vi.mocked(prisma.healthScoreCache.findUnique).mockResolvedValue({
      score: 85,
      expiresAt: futureDate
    } as any)

    const result = await getHealthScoreFromCache('customer-1')
    expect(result).toBe(85)
  })

  it('should return null if cache expired', async () => {
    const pastDate = new Date(Date.now() - 3600000)
    vi.mocked(prisma.healthScoreCache.findUnique).mockResolvedValue({
      score: 85,
      expiresAt: pastDate
    } as any)

    const result = await getHealthScoreFromCache('customer-1')
    expect(result).toBeNull()
  })

  it('should return null if cache not found', async () => {
    vi.mocked(prisma.healthScoreCache.findUnique).mockResolvedValue(null)
    const result = await getHealthScoreFromCache('customer-1')
    expect(result).toBeNull()
  })
})

describe('cacheHealthScore', () => {
  it('should cache score with default TTL', async () => {
    vi.mocked(prisma.healthScoreCache.upsert).mockResolvedValue({} as any)
    await cacheHealthScore('customer-1', 90)
    expect(prisma.healthScoreCache.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { customerId: 'customer-1' },
      create: expect.objectContaining({ score: 90 })
    }))
  })

  it('should use custom TTL', async () => {
    vi.mocked(prisma.healthScoreCache.upsert).mockResolvedValue({} as any)
    await cacheHealthScore('customer-1', 85, 12)
    expect(prisma.healthScoreCache.upsert).toHaveBeenCalled()
  })

  it('should update existing cache', async () => {
    vi.mocked(prisma.healthScoreCache.upsert).mockResolvedValue({} as any)
    await cacheHealthScore('customer-1', 88)
    expect(prisma.healthScoreCache.upsert).toHaveBeenCalledWith(expect.objectContaining({
      update: expect.objectContaining({ score: 88 })
    }))
  })
})

describe('invalidateHealthScoreCache', () => {
  it('should delete cache for customer', async () => {
    vi.mocked(prisma.healthScoreCache.deleteMany).mockResolvedValue({ count: 1 } as any)
    await invalidateHealthScoreCache('customer-1')
    expect(prisma.healthScoreCache.deleteMany).toHaveBeenCalledWith({
      where: { customerId: 'customer-1' }
    })
  })
})
