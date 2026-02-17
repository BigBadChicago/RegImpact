import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { mockAdminUser, mockCustomer } from '../../fixtures/users'

vi.mock('@/auth.config', () => ({
  auth: vi.fn(() => Promise.resolve({ user: { email: mockAdminUser.email } }))
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    activity: { findMany: vi.fn(), count: vi.fn() }
  },
  default: {
    user: { findUnique: vi.fn() },
    activity: { findMany: vi.fn(), count: vi.fn() }
  }
}))

describe('GET /api/activity', () => {
  it('should return 401 if not authenticated', async () => {
    const { auth } = await import('@/auth.config')
    vi.mocked(auth).mockResolvedValueOnce(null as never)
    const { GET } = await import('@/app/api/activity/route')
    const response = await GET(new NextRequest('http://localhost:3000/api/activity?customerId=cust-1'))
    expect(response.status).toBe(401)
  })

  it('should return 400 if customerId missing', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ ...mockAdminUser, customerId: mockCustomer.id } as never)
    const { GET } = await import('@/app/api/activity/route')
    const response = await GET(new NextRequest('http://localhost:3000/api/activity'))
    expect(response.status).toBe(400)
  })

  it('should return 403 if user tries to access different customer activity', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ ...mockAdminUser, customerId: 'cust-1' } as never)
    const { GET } = await import('@/app/api/activity/route')
    const response = await GET(new NextRequest('http://localhost:3000/api/activity?customerId=cust-2'))
    expect(response.status).toBe(403)
  })

  it('should return paginated activity', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ ...mockAdminUser, customerId: 'cust-1' } as never)
    vi.spyOn(prisma.activity, 'findMany').mockResolvedValue([])
    vi.spyOn(prisma.activity, 'count').mockResolvedValue(0)
    
    const { GET } = await import('@/app/api/activity/route')
    const response = await GET(new NextRequest('http://localhost:3000/api/activity?customerId=cust-1&page=0&limit=20'))
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.pagination).toBeDefined()
  })

  it('should limit to max 50 per page', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ ...mockAdminUser, customerId: 'cust-1' } as never)
    vi.spyOn(prisma.activity, 'findMany').mockResolvedValue([])
    vi.spyOn(prisma.activity, 'count').mockResolvedValue(0)
    
    const { GET } = await import('@/app/api/activity/route')
    await GET(new NextRequest('http://localhost:3000/api/activity?customerId=cust-1&limit=999'))
    
    expect(prisma.activity.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 50 }))
  })
})
