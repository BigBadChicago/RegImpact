import { describe, it, expect } from 'vitest'
import { formatCurrency } from '@/components/cost/cost-utils'

describe('formatCurrency', () => {
  it('should format small numbers', () => {
    expect(formatCurrency(1000)).toBe('$1,000')
  })

  it('should format thousands with K suffix', () => {
    expect(formatCurrency(50000)).toBe('$50,000')
  })

  it('should format millions with M suffix', () => {
    expect(formatCurrency(2500000)).toBe('$2,500,000')
  })

  it('should handle zero', () => {
    expect(formatCurrency(0)).toBe('$0')
  })

  it('should round to appropriate decimals', () => {
    expect(formatCurrency(1234)).toBe('$1,234')
    expect(formatCurrency(12345)).toBe('$12,345')
  })

  it('should handle negative numbers', () => {
    expect(formatCurrency(-5000)).toContain('-')
  })
})
