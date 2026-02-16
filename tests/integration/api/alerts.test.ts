import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { mockAdminUser, mockCustomer } from '../../fixtures/users'

vi.mock('@/auth.config', () => ({
  auth: vi.fn(() => Promise.resolve({ user: { email: mockAdminUser.email } }))
}))

describe('GET /api/alerts', () => {
  it('should return 401 if not authenticated', async () => {
    const { auth } = await import('@/auth.config')
    vi.mocked(auth).mockResolvedValueOnce(null as never)
    const { GET } = await import('@/app/api/alerts/route')
    const response = await GET(new NextRequest('http://localhost:3000/api/alerts'))
    expect(response.status).toBe(401)
  })

  it('should return alerts for authenticated user', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ ...mockAdminUser, customerId: mockCustomer.id } as never)
    vi.spyOn(prisma.alert, 'findMany').mockResolvedValue([
      { id: 'alert-1', type: 'CRITICAL', category: 'DEADLINE', title: 'Test', message: 'Test', read: false, actionUrl: '/test', createdAt: new Date() }
    ] as never)
    
    const { GET } = await import('@/app/api/alerts/route')
    const response = await GET(new NextRequest('http://localhost:3000/api/alerts'))
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.alerts).toHaveLength(1)
    expect(prisma.alert.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { customerId: mockCustomer.id, dismissed: false }
    }))
  })

  it('should limit alerts to 50', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ ...mockAdminUser, customerId: mockCustomer.id } as never)
    vi.spyOn(prisma.alert, 'findMany').mockResolvedValue([])
    
    const { GET } = await import('@/app/api/alerts/route')
    await GET(new NextRequest('http://localhost:3000/api/alerts'))
    
    expect(prisma.alert.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 50 }))
  })
})

describe('POST /api/alerts', () => {
  it('should create alert for authenticated user', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ ...mockAdminUser, customerId: mockCustomer.id } as never)
    vi.spyOn(prisma.alert, 'create').mockResolvedValue({ id: 'new-alert', type: 'INFO' } as never)
    
    const { POST } = await import('@/app/api/alerts/route')
    const response = await POST(new NextRequest('http://localhost:3000/api/alerts', {
      method: 'POST',
      body: JSON.stringify({ type: 'INFO', category: 'TEST', title: 'Test', message: 'Test', actionUrl: '/test' })
    }))
    
    expect(response.status).toBe(201)
    expect(prisma.alert.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ customerId: mockCustomer.id })
    }))
  })

  it('should scope alert to user customerId', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ ...mockAdminUser, customerId: 'customer-123' } as never)
    vi.spyOn(prisma.alert, 'create').mockResolvedValue({ id: 'alert' } as never)
    
    const { POST } = await import('@/app/api/alerts/route')
    await POST(new NextRequest('http://localhost:3000/api/alerts', {
      method: 'POST',
      body: JSON.stringify({ type: 'CRITICAL', category: 'DEADLINE', title: 'T', message: 'M', actionUrl: '/' })
    }))
    
    expect(prisma.alert.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ customerId: 'customer-123' })
    }))
  })
})
