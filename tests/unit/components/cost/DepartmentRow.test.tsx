import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DepartmentRow from '@/components/cost/DepartmentRow'
import { CostCategory, Department, RiskLevel } from '@/types/cost-estimate'

describe('DepartmentRow', () => {
  const mockDepartment = {
    department: Department.IT,
    oneTimeCost: 50000,
    recurringCostAnnual: 20000,
    fteImpact: 1.2,
    budgetCode: 'IT-100',
    lineItems: [
      {
        id: 'item-1',
        category: CostCategory.INFRASTRUCTURE,
        description: 'Upgrade tooling',
        isOneTime: true,
        confidence: 0.85,
        estimatedCost: 50000,
        riskLevel: RiskLevel.LOW,
        department: Department.IT
      }
    ]
  }

  it('should render department name', () => {
    render(<DepartmentRow dept={mockDepartment} isExpanded={false} onToggle={() => {}} />)
    expect(screen.getByText('IT')).toBeInTheDocument()
  })

  it('should display costs', () => {
    render(<DepartmentRow dept={mockDepartment} isExpanded={false} onToggle={() => {}} />)
    expect(screen.getByText(/\$50,000/)).toBeInTheDocument()
    expect(screen.getByText(/\$20,000/)).toBeInTheDocument()
  })

  it('should toggle expansion on click', () => {
    const onToggle = vi.fn()
    render(<DepartmentRow dept={mockDepartment} isExpanded={false} onToggle={onToggle} />)
    const button = screen.getByRole('button')
    fireEvent.click(button)
    expect(onToggle).toHaveBeenCalled()
  })

  it('should show breakdown when expanded', () => {
    render(<DepartmentRow dept={mockDepartment} isExpanded={true} onToggle={() => {}} />)
    expect(screen.getByText(/Upgrade tooling/i)).toBeInTheDocument()
    expect(screen.getByText(/Confidence: 85%/i)).toBeInTheDocument()
  })

  it('should display confidence level', () => {
    render(<DepartmentRow dept={mockDepartment} isExpanded={false} onToggle={() => {}} />)
    expect(screen.getByText(/1.2 FTE/i)).toBeInTheDocument()
  })
})
