import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { mockAdminUser } from '../../fixtures/users'

vi.mock('@/auth.config', () => ({
  auth: vi.fn(() => Promise.resolve({ user: { email: mockAdminUser.email } }))
}))

vi.mock('@/lib/email/approval-notifications', () => ({
  sendApprovalEmail: vi.fn()
}))

describe('PATCH /api/approvals/[id]', () => {
  it('should return 401 if not authenticated', async () => {
    const { auth } = await import('@/auth.config')
    vi.mocked(auth).mockResolvedValueOnce(null as never)
    const { PATCH } = await import('@/app/api/approvals/[id]/route')
    const response = await PATCH(
      new NextRequest('http://localhost:3000/api/approvals/123', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'APPROVED' })
      }),
      { params: Promise.resolve({ id: '123' }) }
    )
    expect(response.status).toBe(401)
  })

  it('should return 400 for invalid status', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ ...mockAdminUser, id: 'user-1' } as never)
    const { PATCH } = await import('@/app/api/approvals/[id]/route')
    const response = await PATCH(
      new NextRequest('http://localhost:3000/api/approvals/123', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'INVALID' })
      }),
      { params: Promise.resolve({ id: '123' }) }
    )
    expect(response.status).toBe(400)
  })

  it('should return 404 if approval not found', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ ...mockAdminUser, id: 'user-1' } as never)
    vi.spyOn(prisma.approval, 'findUnique').mockResolvedValue(null)
    const { PATCH } = await import('@/app/api/approvals/[id]/route')
    const response = await PATCH(
      new NextRequest('http://localhost:3000/api/approvals/123', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'APPROVED' })
      }),
      { params: Promise.resolve({ id: '123' }) }
    )
    expect(response.status).toBe(404)
  })

  it('should update approval status', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ ...mockAdminUser, id: 'user-1', name: 'Admin' } as never)
    vi.spyOn(prisma.approval, 'findUnique').mockResolvedValue({
      approverId: 'user-1',
      costEstimate: {
        oneTimeCostLow: 10000,
        oneTimeCostHigh: 15000,
        recurringCostAnnual: 5000,
        regulationVersion: { regulation: { id: 'reg-1', title: 'Test Reg' } }
      },
      requester: { email: 'requester@test.com' }
    } as never)
    vi.spyOn(prisma.approval, 'update').mockResolvedValue({ id: '123', status: 'APPROVED', approvedAt: new Date() } as never)
    
    const { PATCH } = await import('@/app/api/approvals/[id]/route')
    const response = await PATCH(
      new NextRequest('http://localhost:3000/api/approvals/123', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'APPROVED', approverNote: 'Looks good' })
      }),
      { params: Promise.resolve({ id: '123' }) }
    )
    
    expect(response.status).toBe(200)
    expect(prisma.approval.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: '123' },
      data: expect.objectContaining({ status: 'APPROVED', approverId: 'user-1' })
    }))
  })

  it('should return 403 if not assigned approver', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ ...mockAdminUser, id: 'user-1' } as never)
    vi.spyOn(prisma.approval, 'findUnique').mockResolvedValue({
      approverId: 'user-2',
      costEstimate: {} as never,
      requester: { email: 'test@test.com' }
    } as never)
    
    const { PATCH } = await import('@/app/api/approvals/[id]/route')
    const response = await PATCH(
      new NextRequest('http://localhost:3000/api/approvals/123', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'APPROVED' })
      }),
      { params: Promise.resolve({ id: '123' }) }
    )
    expect(response.status).toBe(403)
  })
})
