import type { DeadlineModel } from '../../generated/prisma/models'
import type { DeadlineRiskLevel } from '../../generated/prisma/enums'

/**
 * Mock test data for deadlines
 * Used for testing deadline extraction and management features
 */

/**
 * Interface for deadline candidates (before validation)
 */
export interface DeadlineCandidate {
  date: Date
  context: string
  confidence: number
}

/**
 * Mock deadline candidate with high confidence
 */
export const mockDeadlineCandidate: DeadlineCandidate = {
  date: new Date('2026-03-15'),
  context: 'Compliance required by March 15, 2026',
  confidence: 0.9,
}

/**
 * Mock valid deadline
 */
export const mockValidDeadline: DeadlineModel = {
  id: 'deadline-1',
  regulationVersionId: 'version-1',
  deadlineDate: new Date('2026-03-15'),
  deadlineType: 'submission',
  description: 'Initial compliance filing required',
  riskLevel: 'CRITICAL' as DeadlineRiskLevel,
  extractionConfidence: 0.9,
  notificationSent: false,
  createdAt: new Date('2024-01-01'),
}

/**
 * Mock invalid deadline (date in past)
 */
export const mockInvalidDeadline: DeadlineModel = {
  id: 'deadline-2',
  regulationVersionId: 'version-1',
  deadlineDate: new Date('2020-01-01'),
  deadlineType: 'submission',
  description: 'Past deadline',
  riskLevel: 'ROUTINE' as DeadlineRiskLevel,
  extractionConfidence: 0.8,
  notificationSent: false,
  createdAt: new Date('2024-01-01'),
}

/**
 * Mock regulation text containing multiple deadlines
 */
export const mockRegulationWithDeadlines = `
COMPLIANCE REQUIREMENTS

Section 1: Initial Filing
All covered employers must submit their initial compliance filing by March 15, 2026.
This is a mandatory requirement and failure to comply will result in penalties.

Section 2: Quarterly Reporting
Employers must submit quarterly reports within 30 days of quarter end. These reports
shall include all required wage and hour data as specified in Section 4.

Section 3: Annual Certification
Annual certification must be completed no later than December 31 each calendar year.
This certification attests to the employer's compliance with all provisions of this regulation.

Section 4: Penalties
Violations of this regulation after June 1, 2026 will result in penalties of $10,000 per day
for each day the employer remains non-compliant. Additional fines may apply for willful violations.

Section 5: Implementation Timeline
Employers with 100 or more employees must be in full compliance by end of Q2 2026.
Smaller employers have until end of Q3 2026 to achieve full compliance.
`

/**
 * Mock regulation text without any deadlines
 */
export const mockRegulationWithoutDeadlines = `
GENERAL GUIDELINES

Section 1: Purpose
This regulation establishes general guidelines for workplace safety and employee welfare.
Employers are encouraged to follow best practices and maintain a safe working environment.

Section 2: Recommendations
Companies should implement periodic safety reviews and provide appropriate training.
Regular communication with employees regarding safety matters is recommended.

Section 3: Resources
Additional resources and guidance materials are available on the agency website.
Employers may contact the compliance assistance office for support and guidance.
`

/**
 * Mock regulation text with ambiguous dates
 */
export const mockRegulationWithAmbiguousDates = `
COMPLIANCE TIMELINE

Section 1: Implementation
Employers must implement these requirements within a reasonable time after publication.
Prompt action is encouraged to ensure smooth transition to the new standards.

Section 2: Reporting
Regular updates should be provided to the agency as soon as practicable.
Good faith efforts to comply will be taken into consideration during any review.
`

/**
 * Helper function to create a mock deadline with optional overrides
 */
export function createMockDeadline(overrides?: Partial<DeadlineModel>): DeadlineModel {
  return {
    id: 'deadline-test',
    regulationVersionId: 'version-test',
    deadlineDate: new Date('2025-06-01'),
    deadlineType: 'submission',
    description: 'Test deadline',
    riskLevel: 'ROUTINE' as DeadlineRiskLevel,
    extractionConfidence: 0.85,
    notificationSent: false,
    createdAt: new Date(),
    ...overrides,
  }
}

/**
 * Helper function to create a date X days in the future
 */
export function createFutureDate(daysFromNow: number): Date {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  return date
}

/**
 * Mock deadlines for various risk levels
 */
export const mockCriticalDeadline: DeadlineModel = createMockDeadline({
  id: 'deadline-critical',
  deadlineDate: createFutureDate(15),
  riskLevel: 'CRITICAL' as DeadlineRiskLevel,
  description: 'Critical compliance deadline - penalties apply',
})

export const mockImportantDeadline: DeadlineModel = createMockDeadline({
  id: 'deadline-important',
  deadlineDate: createFutureDate(45),
  riskLevel: 'IMPORTANT' as DeadlineRiskLevel,
  description: 'Important filing deadline',
})

export const mockRoutineDeadline: DeadlineModel = createMockDeadline({
  id: 'deadline-routine',
  deadlineDate: createFutureDate(90),
  riskLevel: 'ROUTINE' as DeadlineRiskLevel,
  description: 'Routine reporting deadline',
})

/**
 * Mock regulation text with various date formats
 */
export const mockRegulationWithVariousDates = `
This regulation requires compliance by the following deadlines:
- Initial assessment: 03/15/2026
- Quarterly report: June 30, 2026
- Mid-year review: by September 30th, 2026
- Annual filing: no later than 12/31/2026
- Ongoing monitoring: within 60 days of any material change
`
