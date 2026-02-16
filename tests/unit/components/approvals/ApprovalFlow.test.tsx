import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ApprovalFlow } from '@/components/approvals/ApprovalFlow'

global.fetch = vi.fn()

describe('ApprovalFlow', () => {
  it('should render request form when no approval', () => {
    render(<ApprovalFlow costEstimateId="est-1" />)
    expect(screen.getByText(/Request Approval/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Add a note/i)).toBeInTheDocument()
  })

  it('should show approval status when provided', () => {
    const approval = {
      id: 'app-1',
      status: 'PENDING' as const,
      requester: { name: 'John Doe' },
      createdAt: new Date()
    }
    render(<ApprovalFlow costEstimateId="est-1" approval={approval} />)
    expect(screen.getByText('PENDING')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('should show approved status', () => {
    const approval = {
      id: 'app-1',
      status: 'APPROVED' as const,
      requester: { name: 'Jane Smith' },
      approver: { name: 'Admin User' },
      createdAt: new Date(),
      approvedAt: new Date()
    }
    render(<ApprovalFlow costEstimateId="est-1" approval={approval} />)
    expect(screen.getByText('APPROVED')).toBeInTheDocument()
  })

  it('should show rejected status', () => {
    const approval = {
      id: 'app-1',
      status: 'REJECTED' as const,
      requester: { name: 'User' },
      approver: { name: 'Admin' },
      approverNote: 'Not approved',
      createdAt: new Date()
    }
    render(<ApprovalFlow costEstimateId="est-1" approval={approval} />)
    expect(screen.getByText('REJECTED')).toBeInTheDocument()
    expect(screen.getByText('Not approved')).toBeInTheDocument()
  })

  it('should handle note input', () => {
    render(<ApprovalFlow costEstimateId="est-1" />)
    const textarea = screen.getByPlaceholderText(/Add a note/i)
    fireEvent.change(textarea, { target: { value: 'Test note' } })
    expect(textarea).toHaveValue('Test note')
  })
})
