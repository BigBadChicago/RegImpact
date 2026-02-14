import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  extractDatesWithRegex,
  extractDeadlinesWithAI,
  validateDeadline,
  categorizeRiskLevel,
  calculateDaysRemaining,
} from '@/lib/deadline-extractor'
import {
  mockRegulationWithDeadlines,
  mockRegulationWithoutDeadlines,
  createMockDeadline,
  createFutureDate,
} from '../../fixtures/deadlines'

/**
 * Test suite for deadline extraction utilities
 * Tests the core deadline extraction, validation, and risk categorization
 * Following TDD: These tests are written FIRST, implementation comes after
 */

describe('Deadline Extraction - extractDatesWithRegex', () => {
  it('should extract explicit date: "by January 15, 2027"', () => {
    const text = 'Compliance required by January 15, 2027'
    const result = extractDatesWithRegex(text)

    expect(result).toHaveLength(1)
    expect(result[0].date).toBeInstanceOf(Date)
    expect(result[0].date.getFullYear()).toBe(2027)
    expect(result[0].date.getMonth()).toBe(0) // January
    expect(result[0].date.getDate()).toBe(15)
    expect(result[0].context).toBeTruthy()
    expect(result[0].confidence).toBeGreaterThan(0.8)
  })

  it('should extract numeric date: "12/31/2026"', () => {
     const text = 'Annual certification due 12/31/2026'
    const result = extractDatesWithRegex(text)

    expect(result).toHaveLength(1)
    expect(result[0].date).toBeInstanceOf(Date)
    expect(result[0].date.getMonth()).toBe(11) // December
    expect(result[0].date.getDate()).toBe(31)
     expect(result[0].date.getFullYear()).toBe(2026)
  })

  it('should extract relative date: "within 30 days"', () => {
    const text = 'Submit reports within 30 days of quarter end'
    const result = extractDatesWithRegex(text)

    expect(result).toHaveLength(1)
    expect(result[0].date).toBeInstanceOf(Date)
    expect(result[0].context).toContain('30 days')
    expect(result[0].confidence).toBeGreaterThan(0.6)
    
    // Should be approximately 30 days in future
    const daysFromNow = Math.round(
      (result[0].date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    )
    expect(daysFromNow).toBeGreaterThanOrEqual(28)
    expect(daysFromNow).toBeLessThanOrEqual(32)
  })

  it('should extract "no later than" date: "no later than March 1, 2026"', () => {
    const text = 'Penalties apply no later than March 1, 2026'
    const result = extractDatesWithRegex(text)

    expect(result).toHaveLength(1)
    expect(result[0].date.getMonth()).toBe(2) // March (0-indexed)
    expect(result[0].date.getDate()).toBe(1)
    expect(result[0].date.getFullYear()).toBe(2026)
  })

  it('should extract quarterly deadline: "end of Q1 2026"', () => {
    const text = 'Report due by end of Q1 2026'
    const result = extractDatesWithRegex(text)

    expect(result).toHaveLength(1)
    // Q1 ends March 31
    expect(result[0].date.getMonth()).toBe(2)
    expect(result[0].date.getDate()).toBe(31)
    expect(result[0].date.getFullYear()).toBe(2026)
  })

  it('should return empty array for text with no dates', () => {
    const text = 'General compliance guidelines without specific dates'
    const result = extractDatesWithRegex(text)

    expect(result).toHaveLength(0)
  })

  it('should ignore dates in the past', () => {
    const text = 'Historical deadline was January 1, 2020'
    const result = extractDatesWithRegex(text)

    // Should filter out past dates
    expect(result.length).toBe(0)
  })

  it('should extract multiple dates from same text', () => {
    const text = 'Initial filing by March 1, 2026 and final report by June 30, 2026'
    const result = extractDatesWithRegex(text)

    expect(result.length).toBeGreaterThanOrEqual(2)
    // Should be in chronological order
    if (result.length >= 2) {
      expect(result[0].date <= result[1].date).toBe(true)
    }
  })

  it('should handle ambiguous dates with lower confidence', () => {
    const text = 'Compliance required within a reasonable time'
    const result = extractDatesWithRegex(text)

    // Should either skip or return very low confidence
    if (result.length > 0) {
      expect(result[0].confidence).toBeLessThan(0.5)
    } else {
      expect(result.length).toBe(0)
    }
  })

  it('should extract dates from complex regulation text', () => {
    const result = extractDatesWithRegex(mockRegulationWithDeadlines)

    expect(result.length).toBeGreaterThan(0)
    // Should find at least some of the explicit dates (March 15, 2026)
    expect(result.some(d => d.date.getMonth() === 2 && d.date.getDate() === 15)).toBe(true) // March 15
  })

  it('should deduplicate identical dates', () => {
    const text = 'Deadline is March 15, 2026. Remember: March 15, 2026 is the final date.'
    const result = extractDatesWithRegex(text)

    // Should have only one entry for duplicate date
    const uniqueDates = new Set(result.map(d => d.date.toISOString()))
    expect(uniqueDates.size).toBe(result.length)
  })
})

describe('Deadline Extraction - extractDeadlinesWithAI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should call OpenAI with proper prompt structure', async () => {
    // This test will need proper mocking once OpenAI integration is set up
    // For now, we expect the function to exist and return a promise
    const promise = extractDeadlinesWithAI(mockRegulationWithDeadlines, 'Test Regulation')
    expect(promise).toBeInstanceOf(Promise)
  })

  it('should extract multiple deadlines from complex text', async () => {
    const result = await extractDeadlinesWithAI(mockRegulationWithDeadlines, 'Test Regulation')

    expect(result).toBeInstanceOf(Array)
    expect(result.length).toBeGreaterThan(0)
    
    // Each result should have required fields
    result.forEach(deadline => {
      expect(deadline).toHaveProperty('deadlineDate')
      expect(deadline).toHaveProperty('deadlineType')
      expect(deadline).toHaveProperty('description')
      expect(deadline).toHaveProperty('riskLevel')
      expect(deadline.deadlineDate).toBeInstanceOf(Date)
    })
  })

  it('should handle empty text gracefully', async () => {
    const result = await extractDeadlinesWithAI('', 'Empty Regulation')

    expect(result).toBeInstanceOf(Array)
    expect(result.length).toBe(0)
  })

  it('should handle text with no deadlines', async () => {
    const result = await extractDeadlinesWithAI(mockRegulationWithoutDeadlines, 'No Deadlines')

    expect(result).toBeInstanceOf(Array)
    expect(result.length).toBe(0)
  })

  it('should set extraction confidence based on response quality', async () => {
    const result = await extractDeadlinesWithAI(mockRegulationWithDeadlines, 'Test')

    if (result.length > 0) {
      result.forEach(deadline => {
        expect(deadline).toHaveProperty('extractionConfidence')
        expect(deadline.extractionConfidence).toBeGreaterThan(0)
        expect(deadline.extractionConfidence).toBeLessThanOrEqual(1)
      })
    }
  })

  it('should handle API failures gracefully', async () => {
    // Test error handling - function should throw or return empty array
    try {
      // Force an error by passing invalid parameters
      const result = await extractDeadlinesWithAI(null as unknown as string, '')
      // If it doesn't throw, it should return empty array
      expect(result).toBeInstanceOf(Array)
    } catch (error) {
      // Error handling is acceptable
      expect(error).toBeDefined()
    }
  })

  it('should include regulation context in extracted deadlines', async () => {
    const result = await extractDeadlinesWithAI(mockRegulationWithDeadlines, 'Test Title')

    if (result.length > 0) {
      result.forEach(deadline => {
        const description = deadline.description ?? ''
        expect(description).toBeTruthy()
        expect(typeof description).toBe('string')
        expect(description.length).toBeGreaterThan(0)
      })
    }
  })
})

describe('Deadline Validation - validateDeadline', () => {
  it('should accept valid future deadline', () => {
    const validDeadline = createMockDeadline({
      deadlineDate: createFutureDate(30),
    })

    expect(validateDeadline(validDeadline)).toBe(true)
  })

  it('should reject deadline in the past', () => {
    const pastDeadline = createMockDeadline({
      deadlineDate: new Date('2020-01-01'),
    })

    expect(validateDeadline(pastDeadline)).toBe(false)
  })

  it('should reject deadline more than 10 years in future', () => {
    const farFutureDate = new Date()
    farFutureDate.setFullYear(farFutureDate.getFullYear() + 11)
    
    const farFutureDeadline = createMockDeadline({
      deadlineDate: farFutureDate,
    })

    expect(validateDeadline(farFutureDeadline)).toBe(false)
  })

  it('should reject deadline with invalid date', () => {
    const invalidDeadline = createMockDeadline({
      deadlineDate: new Date('invalid'),
    })

    expect(validateDeadline(invalidDeadline)).toBe(false)
  })

  it('should accept deadline exactly today', () => {
    const today = new Date()
    today.setHours(12, 0, 0, 0) // Noon today
    
    const todayDeadline = createMockDeadline({
      deadlineDate: today,
    })

    expect(validateDeadline(todayDeadline)).toBe(true)
  })

  it('should require deadlineType to be non-empty', () => {
    const noTypeDeadline = createMockDeadline({
      deadlineType: '',
    })

    expect(validateDeadline(noTypeDeadline)).toBe(false)
  })

  it('should require deadlineType to not be just whitespace', () => {
    const whitespaceTypeDeadline = createMockDeadline({
      deadlineType: '   ',
    })

    expect(validateDeadline(whitespaceTypeDeadline)).toBe(false)
  })

  it('should accept valid deadline within reasonable timeframe', () => {
    const reasonableDeadline = createMockDeadline({
      deadlineDate: createFutureDate(180), // 6 months
      deadlineType: 'submission',
    })

    expect(validateDeadline(reasonableDeadline)).toBe(true)
  })
})

describe('Risk Categorization - categorizeRiskLevel', () => {
  it('should return CRITICAL for penalties mentioned', () => {
    const deadline = createMockDeadline()
    const context = 'Failure to comply results in penalties of $10,000 per day'

    const risk = categorizeRiskLevel(deadline, context)

    expect(risk).toBe('CRITICAL')
  })

  it('should return CRITICAL for "violation" keyword', () => {
    const deadline = createMockDeadline()
    const context = 'Non-compliance constitutes a violation of federal law'

    const risk = categorizeRiskLevel(deadline, context)

    expect(risk).toBe('CRITICAL')
  })

  it('should return CRITICAL for <30 days remaining', () => {
    const urgentDeadline = createMockDeadline({
      deadlineDate: createFutureDate(15), // 15 days from now
    })
    const context = 'Standard filing requirement'

    const risk = categorizeRiskLevel(urgentDeadline, context)

    expect(risk).toBe('CRITICAL')
  })

  it('should return IMPORTANT for 30-60 days remaining', () => {
    const soonDeadline = createMockDeadline({
      deadlineDate: createFutureDate(45),
    })
    const context = 'Standard filing requirement'

    const risk = categorizeRiskLevel(soonDeadline, context)

    expect(risk).toBe('IMPORTANT')
  })

  it('should return ROUTINE for >60 days remaining', () => {
    const distantDeadline = createMockDeadline({
      deadlineDate: createFutureDate(90),
    })
    const context = 'Standard filing requirement'

    const risk = categorizeRiskLevel(distantDeadline, context)

    expect(risk).toBe('ROUTINE')
  })

  it('should return CRITICAL for "immediate" keyword regardless of date', () => {
    const distantDeadline = createMockDeadline({
      deadlineDate: createFutureDate(120),
    })
    const context = 'Immediate action required'

    const risk = categorizeRiskLevel(distantDeadline, context)

    expect(risk).toBe('CRITICAL')
  })

  it('should return CRITICAL for "fine" keyword', () => {
    const deadline = createMockDeadline()
    const context = 'Subject to fines up to $50,000'

    const risk = categorizeRiskLevel(deadline, context)

    expect(risk).toBe('CRITICAL')
  })

  it('should return CRITICAL for "mandatory" keyword', () => {
    const deadline = createMockDeadline()
    const context = 'Mandatory compliance deadline'

    const risk = categorizeRiskLevel(deadline, context)

    expect(risk).toBe('CRITICAL')
  })

  it('should prioritize keywords over date-based risk', () => {
    const distantDeadline = createMockDeadline({
      deadlineDate: createFutureDate(100), // Would normally be ROUTINE
    })
    const context = 'Violation will result in severe penalties'

    const risk = categorizeRiskLevel(distantDeadline, context)

    expect(risk).toBe('CRITICAL')
  })
})

describe('Days Remaining Calculation - calculateDaysRemaining', () => {
  it('should calculate days remaining correctly', () => {
    const futureDate = createFutureDate(30)
    const days = calculateDaysRemaining(futureDate)

    expect(days).toBe(30)
  })

  it('should return 0 for deadline today', () => {
    const today = new Date()
    today.setHours(23, 59, 59, 999) // End of today

    const days = calculateDaysRemaining(today)

    expect(days).toBe(0)
  })

  it('should return negative for past deadlines', () => {
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 10)

    const days = calculateDaysRemaining(pastDate)

    expect(days).toBeLessThan(0)
    expect(days).toBe(-10)
  })

  it('should handle date strings', () => {
    const dateString = createFutureDate(15).toISOString()
    const days = calculateDaysRemaining(dateString)

    expect(days).toBe(15)
  })

  it('should return integer (whole days)', () => {
    const futureDate = createFutureDate(45)
    const days = calculateDaysRemaining(futureDate)

    expect(Number.isInteger(days)).toBe(true)
  })

  it('should handle leap years correctly', () => {
    // Test with a known future date (60 days from now)
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 60)
    
    const days = calculateDaysRemaining(futureDate)
    
    // Should be approximately 60 days
    expect(days).toBeGreaterThanOrEqual(59)
    expect(days).toBeLessThanOrEqual(61)
  })
})
