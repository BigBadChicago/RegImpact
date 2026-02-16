import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import CostBreakdownTable from '@/components/cost/CostBreakdownTable'
import { CostCategory, Department, RiskLevel } from '@/types/cost-estimate'

describe('CostBreakdownTable', () => {
  const mockEstimate = {
    id: 'estimate-1',
    regulationVersionId: 'version-1',
    customerId: 'customer-1',
    oneTimeCostLow: 100000,
    oneTimeCostHigh: 150000,
    recurringCostAnnual: 50000,
    costDrivers: [
      {
        id: 'driver-1',
        category: CostCategory.TRAINING,
        description: 'Staff training',
        estimatedCost: 25000,
        isOneTime: true,
        confidence: 0.9,
        riskLevel: RiskLevel.LOW,
        department: Department.HR
      }
    ],
    departmentBreakdown: [
      {
        department: Department.IT,
        oneTimeCost: 80000,
        recurringCostAnnual: 30000,
        fteImpact: 1.1,
        budgetCode: 'IT-200',
        lineItems: [
          {
            id: 'item-1',
            category: CostCategory.INFRASTRUCTURE,
            description: 'System upgrades',
            estimatedCost: 80000,
            isOneTime: true,
            confidence: 0.8,
            riskLevel: RiskLevel.MEDIUM,
            department: Department.IT
          }
        ]
      }
    ],
    estimationMethod: 'DETERMINISTIC',
    confidence: 0.85,
    createdAt: new Date()
  }

  it('should render cost summary cards', () => {
    render(<CostBreakdownTable estimate={mockEstimate} />)
    expect(screen.getByText(/One-Time Cost/i)).toBeInTheDocument()
    expect(screen.getByText(/Annual Recurring Cost/i)).toBeInTheDocument()
    expect(screen.getByText(/3-Year Total Exposure/i)).toBeInTheDocument()
  })

  it('should display regulation title', () => {
    render(<CostBreakdownTable estimate={mockEstimate} regulationTitle="Test Regulation" />)
    expect(screen.getByText('Test Regulation')).toBeInTheDocument()
  })

  it('should show department breakdown', () => {
    render(<CostBreakdownTable estimate={mockEstimate} />)
    expect(screen.getByText('IT')).toBeInTheDocument()
  })

  it('should calculate 3-year total correctly', () => {
    render(<CostBreakdownTable estimate={mockEstimate} />)
    const expectedLow = 100000 + 50000 * 3
    const expectedHigh = 150000 + 50000 * 3
    expect(screen.getByText(new RegExp(`\\$${expectedLow.toLocaleString()}`))).toBeInTheDocument()
  })

  it('should render scenarios when provided', () => {
    const baseScenario = {
      description: 'Scenario details',
      oneTimeCost: 100000,
      recurringCostAnnual: 20000,
      threeYearTotal: 160000,
      riskLevel: RiskLevel.LOW,
      assumptions: []
    }
    const scenarios = {
      minimal: { ...baseScenario, name: 'Minimal' },
      standard: { ...baseScenario, name: 'Standard' },
      bestInClass: { ...baseScenario, name: 'Best In Class' },
      delay90Days: { ...baseScenario, name: 'Delay 90 Days', riskLevel: RiskLevel.HIGH },
      recommended: 'standard' as const
    }
    render(<CostBreakdownTable estimate={mockEstimate} scenarios={scenarios} />)
    expect(screen.getByText(/Implementation Scenarios/i)).toBeInTheDocument()
    expect(screen.getByText(/Minimal/i)).toBeInTheDocument()
  })
})
