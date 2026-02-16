import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { mockAdminUser } from '../../fixtures/users'

vi.mock('@/auth.config', () => ({
  auth: vi.fn(() => Promise.resolve({ user: { email: mockAdminUser.email } }))
}))

describe('GET /api/approvals', () => {
  it('should return 401 if not authenticated', async () => {
    const { auth } = await import('@/auth.config')
    vi.mocked(auth).mockResolvedValueOnce(null as never)
    const { GET } = await import('@/app/api/approvals/route')
    const response = await GET(new NextRequest('http://localhost:3000/api/approvals'))
    expect(response.status).toBe(401)
  })

  it('should return approvals for requester role', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ ...mockAdminUser, id: 'user-1' } as never)
    vi.spyOn(prisma.approval, 'findMany').mockResolvedValue([])
    
    const { GET } = await import('@/app/api/approvals/route')
    await GET(new NextRequest('http://localhost:3000/api/approvals?role=requester'))
    
    expect(prisma.approval.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { requesterId: 'user-1', status: undefined }
    }))
  })

  it('should return approvals for approver role', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ ...mockAdminUser, id: 'user-1' } as never)
    vi.spyOn(prisma.approval, 'findMany').mockResolvedValue([])
    
    const { GET } = await import('@/app/api/approvals/route')
    await GET(new NextRequest('http://localhost:3000/api/approvals?role=approver&status=PENDING'))
    
    expect(prisma.approval.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { approverId: 'user-1', status: 'PENDING' }
    }))
  })

  it('should limit to 20 results', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ ...mockAdminUser, id: 'user-1' } as never)
    vi.spyOn(prisma.approval, 'findMany').mockResolvedValue([])
    
    const { GET } = await import('@/app/api/approvals/route')
    await GET(new NextRequest('http://localhost:3000/api/approvals'))
    
    expect(prisma.approval.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 20 }))
  })
})

describe('POST /api/approvals', () => {
  it('should create approval request', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ ...mockAdminUser, id: 'user-1' } as never)
    vi.spyOn(prisma.approval, 'create').mockResolvedValue({ id: 'approval-1', status: 'PENDING' } as never)
    
    const { POST } = await import('@/app/api/approvals/route')
    const response = await POST(new NextRequest('http://localhost:3000/api/approvals', {
      method: 'POST',
      body: JSON.stringify({ costEstimateId: 'est-1', requestNote: 'Please approve' })
    }))
    
    const data = await response.json()
    expect(response.status).toBe(201)
    expect(data.status).toBe('PENDING')
  })

  it('should return 400 if costEstimateId missing', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ ...mockAdminUser, id: 'user-1' } as never)
    
    const { POST } = await import('@/app/api/approvals/route')
    const response = await POST(new NextRequest('http://localhost:3000/api/approvals', {
      method: 'POST',
      body: JSON.stringify({ requestNote: 'Note' })
    }))
    
    expect(response.status).toBe(400)
  })
})
