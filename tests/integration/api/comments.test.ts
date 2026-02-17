import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { mockAdminUser } from '../../fixtures/users'

vi.mock('@/auth.config', () => ({
  auth: vi.fn(() => Promise.resolve({ user: { email: mockAdminUser.email } }))
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    comment: { findMany: vi.fn(), count: vi.fn(), create: vi.fn() }
  },
  default: {
    user: { findUnique: vi.fn() },
    comment: { findMany: vi.fn(), count: vi.fn(), create: vi.fn() }
  }
}))

describe('GET /api/comments', () => {
  it('should return 400 if regulationId missing', async () => {
    const { GET } = await import('@/app/api/comments/route')
    const response = await GET(new Request('http://localhost:3000/api/comments'))
    expect(response.status).toBe(400)
  })

  it('should return paginated comments', async () => {
    vi.spyOn(prisma.comment, 'findMany').mockResolvedValue([])
    vi.spyOn(prisma.comment, 'count').mockResolvedValue(0)
    
    const { GET } = await import('@/app/api/comments/route')
    const response = await GET(new Request('http://localhost:3000/api/comments?regulationId=reg-1&page=0&limit=20'))
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.pagination).toBeDefined()
    expect(prisma.comment.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { regulationId: 'reg-1', parentId: null }
    }))
  })

  it('should limit to max 50 comments per page', async () => {
    vi.spyOn(prisma.comment, 'findMany').mockResolvedValue([])
    vi.spyOn(prisma.comment, 'count').mockResolvedValue(0)
    
    const { GET } = await import('@/app/api/comments/route')
    await GET(new Request('http://localhost:3000/api/comments?regulationId=reg-1&limit=999'))
    
    expect(prisma.comment.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 50 }))
  })

  it('should include replies in response', async () => {
    vi.spyOn(prisma.comment, 'findMany').mockResolvedValue([])
    vi.spyOn(prisma.comment, 'count').mockResolvedValue(0)
    
    const { GET } = await import('@/app/api/comments/route')
    await GET(new Request('http://localhost:3000/api/comments?regulationId=reg-1'))
    
    expect(prisma.comment.findMany).toHaveBeenCalledWith(expect.objectContaining({
      select: expect.objectContaining({ replies: expect.any(Object) })
    }))
  })
})

describe('POST /api/comments', () => {
  it('should return 401 if not authenticated', async () => {
    const { auth } = await import('@/auth.config')
    vi.mocked(auth).mockResolvedValueOnce(null)
    const { POST } = await import('@/app/api/comments/route')
    const response = await POST(new Request('http://localhost:3000/api/comments', {
      method: 'POST',
      body: JSON.stringify({ regulationId: 'reg-1', content: 'Test' })
    }))
    expect(response.status).toBe(401)
  })

  it('should create comment', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ ...mockAdminUser, id: 'user-1', customerId: 'cust-1' } as any)
    vi.spyOn(prisma.comment, 'create').mockResolvedValue({ id: 'comment-1' } as any)
    
    const { POST } = await import('@/app/api/comments/route')
    const response = await POST(new Request('http://localhost:3000/api/comments', {
      method: 'POST',
      body: JSON.stringify({ regulationId: 'reg-1', content: 'Great regulation!' })
    }))
    
    expect(response.status).toBe(201)
  })
})
