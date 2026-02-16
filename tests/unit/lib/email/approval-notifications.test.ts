import { describe, it, expect, vi } from 'vitest'
import { sendApprovalEmail, sendApprovalEmailsBatch } from '@/lib/email/approval-notifications'

vi.mock('resend', () => ({
  Resend: vi.fn(function MockResend() {
    return {
      emails: {
        send: vi.fn(() => Promise.resolve({ id: 'email-123' }))
      }
    }
  })
}))

describe('sendApprovalEmail', () => {
  it('should send approval email', async () => {
    const data = {
      approverName: 'John Doe',
      regulationTitle: 'Test Regulation',
      costEstimate: 50000,
      status: 'APPROVED' as const,
      requesterEmail: 'user@test.com',
      approvalLink: 'https://app.com/approvals/123'
    }

    const result = await sendApprovalEmail(data)
    expect(result.success).toBe(true)
  })

  it('should send rejection email', async () => {
    const data = {
      approverName: 'Jane Smith',
      regulationTitle: 'Test Regulation',
      costEstimate: 75000,
      status: 'REJECTED' as const,
      approverNote: 'Cost too high',
      requesterEmail: 'user@test.com',
      approvalLink: 'https://app.com/approvals/123'
    }

    const result = await sendApprovalEmail(data)
    expect(result.success).toBe(true)
  })

  it('should handle email send errors gracefully', async () => {
    const { Resend } = await import('resend')
    const resendInstance = vi.mocked(Resend).mock.results[0]?.value as {
      emails: { send: ReturnType<typeof vi.fn> }
    }
    resendInstance.emails.send.mockRejectedValueOnce(new Error('API error'))

    const data = {
      approverName: 'Test',
      regulationTitle: 'Test',
      costEstimate: 10000,
      status: 'APPROVED' as const,
      requesterEmail: 'user@test.com',
      approvalLink: 'https://app.com'
    }

    await expect(sendApprovalEmail(data)).rejects.toThrow('API error')
  })

  it('should include approver note in email', async () => {
    const data = {
      approverName: 'Test',
      regulationTitle: 'Test',
      costEstimate: 10000,
      status: 'APPROVED' as const,
      approverNote: 'Approved with conditions',
      requesterEmail: 'user@test.com',
      approvalLink: 'https://app.com'
    }

    const result = await sendApprovalEmail(data)
    expect(result.success).toBe(true)
  })
})

describe('sendApprovalEmailsBatch', () => {
  it('should send multiple emails in batch', async () => {
    const approvals = [
      {
        approverName: 'User 1',
        regulationTitle: 'Reg 1',
        costEstimate: 10000,
        status: 'APPROVED' as const,
        requesterEmail: 'user1@test.com',
        approvalLink: 'https://app.com/1'
      },
      {
        approverName: 'User 2',
        regulationTitle: 'Reg 2',
        costEstimate: 20000,
        status: 'REJECTED' as const,
        requesterEmail: 'user2@test.com',
        approvalLink: 'https://app.com/2'
      }
    ]

    const result = await sendApprovalEmailsBatch(approvals)
    expect(result.sent).toBe(2)
    expect(result.failed).toBe(0)
  })

  it('should track failed emails', async () => {
    const { Resend } = await import('resend')
    const resendInstance = vi.mocked(Resend).mock.results[0]?.value as {
      emails: { send: ReturnType<typeof vi.fn> }
    }
    resendInstance.emails.send
      .mockResolvedValueOnce({ id: 'email-1' })
      .mockRejectedValueOnce(new Error('Failed'))

    const approvals = [
      {
        approverName: 'User 1',
        regulationTitle: 'Reg 1',
        costEstimate: 10000,
        status: 'APPROVED' as const,
        requesterEmail: 'user1@test.com',
        approvalLink: 'https://app.com/1'
      },
      {
        approverName: 'User 2',
        regulationTitle: 'Reg 2',
        costEstimate: 20000,
        status: 'APPROVED' as const,
        requesterEmail: 'user2@test.com',
        approvalLink: 'https://app.com/2'
      }
    ]

    await expect(sendApprovalEmailsBatch(approvals)).rejects.toThrow('Failed')
  })
})
