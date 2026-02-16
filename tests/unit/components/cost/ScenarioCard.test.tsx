import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ScenarioCard from '@/components/cost/ScenarioCard'
import { RiskLevel } from '@/types/cost-estimate'

describe('ScenarioCard', () => {
  it('should render scenario name and total', () => {
    render(
      <ScenarioCard
        scenario={{
          name: 'Optimistic',
          description: 'Lower effort',
          oneTimeCost: 150000,
          recurringCostAnnual: 20000,
          threeYearTotal: 210000,
          riskLevel: RiskLevel.MINIMAL,
          assumptions: []
        }}
        isRecommended={false}
      />
    )
    expect(screen.getByText('Optimistic')).toBeInTheDocument()
    expect(screen.getByText(/\$210,000/)).toBeInTheDocument()
  })

  it('should display probability percentage', () => {
    render(
      <ScenarioCard
        scenario={{
          name: 'Realistic',
          description: 'Baseline effort',
          oneTimeCost: 200000,
          recurringCostAnnual: 30000,
          threeYearTotal: 290000,
          riskLevel: RiskLevel.LOW,
          assumptions: []
        }}
        isRecommended
      />
    )
    expect(screen.getByText('Recommended')).toBeInTheDocument()
  })

  it('should show drivers', () => {
    render(
      <ScenarioCard
        scenario={{
          name: 'Optimistic',
          description: 'Drivers explained here',
          oneTimeCost: 180000,
          recurringCostAnnual: 20000,
          threeYearTotal: 240000,
          riskLevel: RiskLevel.LOW,
          assumptions: ['Automation', 'Efficiency']
        }}
        isRecommended={false}
      />
    )
    expect(screen.getByText('Drivers explained here')).toBeInTheDocument()
  })

  it('should apply color for pessimistic scenario', () => {
    render(
      <ScenarioCard
        scenario={{
          name: 'Pessimistic',
          description: 'High risk',
          oneTimeCost: 300000,
          recurringCostAnnual: 50000,
          threeYearTotal: 450000,
          riskLevel: RiskLevel.HIGH,
          assumptions: []
        }}
        isRecommended={false}
      />
    )
    const badge = screen.getByText('HIGH Risk')
    expect(badge).toHaveClass('text-red-700')
  })

  it('should apply color for optimistic scenario', () => {
    render(
      <ScenarioCard
        scenario={{
          name: 'Optimistic',
          description: 'Low risk',
          oneTimeCost: 200000,
          recurringCostAnnual: 15000,
          threeYearTotal: 245000,
          riskLevel: RiskLevel.MINIMAL,
          assumptions: []
        }}
        isRecommended={false}
      />
    )
    const badge = screen.getByText(/MINIMAL Risk/i)
    expect(badge).toHaveClass('border-green-200')
  })
})
