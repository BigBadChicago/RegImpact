import { describe, it, expect, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import { mockAdminUser, mockCustomer } from '../../fixtures/users'

vi.mock('@/auth.config', () => ({
  auth: vi.fn(() => Promise.resolve({ user: { email: mockAdminUser.email } }))
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() }
  },
  default: {
    user: { findUnique: vi.fn() }
  }
}))

vi.mock('@/lib/analytics/trends', () => ({
  calculateVelocity: vi.fn(() => Promise.resolve([])),
  calculateCostTrend: vi.fn(() => Promise.resolve([])),
  forecastRegulations: vi.fn(() => ({ predictions: [], model: { slope: 0, intercept: 0, r2: 0 } })),
  getHealthScoreHistory: vi.fn(() => Promise.resolve([])),
  calculateDepartmentMatrix: vi.fn(() => Promise.resolve([])),
  calculateGeoHeatMap: vi.fn(() => Promise.resolve([]))
}))

vi.mock('@/lib/dashboard/metrics', () => ({
  calculateHealthScore: vi.fn(() => Promise.resolve({ deadlineAdherence: 90, costPredictability: 85, riskExposure: 80, weights: { deadlineAdherence: 0.4, costPredictability: 0.4, riskExposure: 0.2 } }))
}))

describe('GET /api/analytics', () => {
  it('should return 401 if not authenticated', async () => {
    const { auth } = await import('@/auth.config')
    vi.mocked(auth).mockResolvedValueOnce(null)
    const { GET } = await import('@/app/api/analytics/route')
    const response = await GET(new Request('http://localhost:3000/api/analytics'))
    expect(response.status).toBe(401)
  })

  it('should return velocity data', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ ...mockAdminUser, customerId: mockCustomer.id, customer: mockCustomer } as any)
    const { calculateVelocity } = await import('@/lib/analytics/trends')
    vi.mocked(calculateVelocity).mockResolvedValue([{ month: '2026-01', count: 5, change: 10 }])
    
    const { GET } = await import('@/app/api/analytics/route')
    const response = await GET(new Request('http://localhost:3000/api/analytics?type=velocity&period=12'))
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.velocity).toBeDefined()
  })

  it('should return cost trend data', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ ...mockAdminUser, customerId: mockCustomer.id, customer: mockCustomer } as any)
    const { calculateCostTrend } = await import('@/lib/analytics/trends')
    vi.mocked(calculateCostTrend).mockResolvedValue([{ month: '2026-01', totalCost: 50000, rollingAverage: 48000 }])
    
    const { GET } = await import('@/app/api/analytics/route')
    const response = await GET(new Request('http://localhost:3000/api/analytics?type=costTrend'))
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.costTrend).toBeDefined()
  })

  it('should return forecast data', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ ...mockAdminUser, customerId: mockCustomer.id, customer: mockCustomer } as any)
    const { calculateVelocity } = await import('@/lib/analytics/trends')
    vi.mocked(calculateVelocity).mockResolvedValue([])
    
    const { GET } = await import('@/app/api/analytics/route')
    const response = await GET(new Request('http://localhost:3000/api/analytics?type=forecast'))
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.forecast).toBeDefined()
  })

  it('should return health score data', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ ...mockAdminUser, customerId: mockCustomer.id, customer: mockCustomer } as any)
    
    const { GET } = await import('@/app/api/analytics/route')
    const response = await GET(new Request('http://localhost:3000/api/analytics?type=healthScore'))
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.current).toBeDefined()
  })
})
