import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import SummaryCard from '@/components/cost/SummaryCard'

describe('SummaryCard', () => {
  it('should render label and value', () => {
    render(<SummaryCard label="Test Label" value="$50,000" />)
    expect(screen.getByText('Test Label')).toBeInTheDocument()
    expect(screen.getByText('$50,000')).toBeInTheDocument()
  })

  it('should render description', () => {
    render(<SummaryCard label="Label" value="Value" description="Test description" />)
    expect(screen.getByText('Test description')).toBeInTheDocument()
  })

  it('should apply custom className', () => {
    const { container } = render(<SummaryCard label="Label" value="Value" accentClassName="custom-border" />)
    expect(container.firstChild).toHaveClass('custom-border')
  })

  it('should apply value className', () => {
    render(<SummaryCard label="Label" value="Value" valueClassName="text-blue-700" />)
    const value = screen.getByText('Value')
    expect(value).toHaveClass('text-blue-700')
  })
})
