import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/alerts/generator', () => ({
  generateAlertsForAllCustomers: vi.fn(() => Promise.resolve({ customersProcessed: 5, alertsCreated: 10 }))
}))

describe('POST /api/cron/alerts', () => {
  it('should return 401 if no secret provided', async () => {
    process.env.CRON_SECRET = 'test-secret'
    const { POST } = await import('@/app/api/cron/alerts/route')
    const response = await POST(new Request('http://localhost:3000/api/cron/alerts', { method: 'POST' }))
    expect(response.status).toBe(401)
  })

  it('should accept vercel cron header', async () => {
    process.env.CRON_SECRET = 'test-secret'
    const { POST } = await import('@/app/api/cron/alerts/route')
    const response = await POST(new Request('http://localhost:3000/api/cron/alerts', {
      method: 'POST',
      headers: { 'x-vercel-cron-secret': 'test-secret' }
    }))
    expect(response.status).toBe(200)
  })

  it('should accept query param secret', async () => {
    process.env.CRON_SECRET = 'test-secret'
    const { POST } = await import('@/app/api/cron/alerts/route')
    const response = await POST(new Request('http://localhost:3000/api/cron/alerts?secret=test-secret', { method: 'POST' }))
    expect(response.status).toBe(200)
  })

  it('should generate alerts for all customers', async () => {
    process.env.CRON_SECRET = 'test-secret'
    const { generateAlertsForAllCustomers } = await import('@/lib/alerts/generator')
    const { POST } = await import('@/app/api/cron/alerts/route')
    await POST(new Request('http://localhost:3000/api/cron/alerts?secret=test-secret', { method: 'POST' }))
    expect(generateAlertsForAllCustomers).toHaveBeenCalled()
  })
})

describe('GET /api/cron/alerts', () => {
  it('should return 401 without secret', async () => {
    process.env.CRON_SECRET = 'test-secret'
    const { GET } = await import('@/app/api/cron/alerts/route')
    const response = await GET(new Request('http://localhost:3000/api/cron/alerts'))
    expect(response.status).toBe(401)
  })

  it('should work with correct secret', async () => {
    process.env.CRON_SECRET = 'test-secret'
    const { GET } = await import('@/app/api/cron/alerts/route')
    const response = await GET(new Request('http://localhost:3000/api/cron/alerts?secret=test-secret'))
    expect(response.status).toBe(200)
  })
})
