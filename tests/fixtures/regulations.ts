import type {
  JurisdictionModel,
  RegulationModel,
  RegulationVersionModel,
  PolicyDiffModel,
} from '../../generated/prisma/models'
import type {
  PolicyDiffSignificance,
  JurisdictionType,
  RegulationStatus,
} from '../../generated/prisma/enums'

/**
 * Mock test data for regulations, versions, and comparisons
 * Used for testing policy diff generation and comparison features
 */

/**
 * Mock California jurisdiction
 */
export const mockJurisdiction: JurisdictionModel = {
  id: 'jurisdiction-ca',
  code: 'CA',
  name: 'California',
  type: 'STATE' as JurisdictionType,
}

/**
 * Mock Paid Sick Leave regulation
 */
export const mockRegulation: RegulationModel & { versions?: RegulationVersionModel[] } =
  {
    id: 'regulation-psl-ca',
    jurisdictionId: mockJurisdiction.id,
    regulationType: 'employment',
    title: 'Paid Sick Leave Act',
    sourceUrl: 'https://www.dir.ca.gov/dlse/paid_sick_leave.html',
    effectiveDate: new Date('2024-01-01'),
    status: 'ACTIVE' as RegulationStatus,
    createdAt: new Date('2024-01-01'),
    versions: [],
  }

/**
 * Mock regulation versions (v1 and v2)
 * Version 1: Original 3 days requirement
 * Version 2: Updated 5 days requirement with accrual formula
 */
export const mockRegulationVersions: RegulationVersionModel[] = [
  {
    id: 'version-psl-ca-1',
    regulationId: mockRegulation.id,
    versionNumber: 1,
    contentText: '3 days of paid sick leave per calendar year. Employees may use paid sick leave for any reason.',
    contentJson: {
      sections: [{ title: 'Benefits', text: '3 days paid sick leave' }],
    },
    publishedDate: new Date('2024-01-01'),
    ingestedDate: new Date('2024-01-01'),
  },
  {
    id: 'version-psl-ca-2',
    regulationId: mockRegulation.id,
    versionNumber: 2,
    contentText: '5 days of paid sick leave per calendar year. Paid sick leave accrues at a rate of 1 hour per 30 hours of work. Employees may use paid sick leave for any reason.',
    contentJson: {
      sections: [{ title: 'Benefits', text: '5 days paid sick leave with accrual' }],
    },
    publishedDate: new Date('2026-01-01'),
    ingestedDate: new Date('2025-12-01'),
  },
]

/**
 * Mock PolicyDiff comparing versions 1 and 2
 */
export const mockPolicyDiff: PolicyDiffModel = {
  id: 'diff-psl-ca-1-2',
  regulationVersionId: mockRegulationVersions[1].id,
  previousVersionId: mockRegulationVersions[0].id,
  diffText: `- 3 days of paid sick leave per calendar year
+ 5 days of paid sick leave per calendar year
+ Paid sick leave accrues at a rate of 1 hour per 30 hours of work`,
  summary:
    'The regulation has been updated to increase minimum paid sick leave from 3 days to 5 days annually and introduces a new accrual formula.',
  keyChanges: [
    'Increased minimum paid leave from 3 days to 5 days per year',
    'Added accrual formula: 1 hour per 30 hours of work',
    'Clarified eligibility for all employees including part-time',
  ],
  significanceScore: 'HIGH' as PolicyDiffSignificance,
  aiConfidence: 0.92,
  createdAt: new Date('2025-12-15'),
}

/**
 * Mock upcoming deadlines
 */
export const mockDeadlines = [
  {
    id: 'deadline-1',
    regulationVersionId: mockRegulationVersions[1].id,
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    title: 'California Paid Sick Leave: Policy Update Required',
    description:
      'Companies must update employee handbooks and post updated policy',
    riskLevel: 'IMPORTANT' as const,
    createdAt: new Date('2025-12-15'),
    updatedAt: new Date('2025-12-15'),
  },
  {
    id: 'deadline-2',
    regulationVersionId: mockRegulationVersions[1].id,
    dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    title: 'System Implementation Complete',
    description: 'Payroll and HR systems must be updated to reflect new rules',
    riskLevel: 'CRITICAL' as const,
    createdAt: new Date('2025-12-15'),
    updatedAt: new Date('2025-12-15'),
  },
]

/**
 * Mock cost estimate for compliance
 */
export const mockCostEstimate = {
  id: 'cost-1',
  regulationVersionId: mockRegulationVersions[1].id,
  customerId: 'customer-1',
  estimatedCost: 75000,
  costBreakdown: [
    { item: 'Policy Review & Drafting', cost: 5000 },
    { item: 'System Updates (Payroll & HR)', cost: 15000 },
    { item: 'Employee Training', cost: 8000 },
    { item: 'Compliance Audit', cost: 7000 },
    { item: 'Increased Labor Costs (Annual)', cost: 40000 },
  ],
  confidenceLevel: 0.75,
  notes:
    'Estimates based on 250+ employee company. Actual costs may vary based on current payroll system.',
  createdAt: new Date('2025-12-15'),
  updatedAt: new Date('2025-12-15'),
}

/**
 * Helper: Create mock regulation with overrides
 * @example
 * const regulation = createMockRegulation({ name: 'New Regulation' })
 */
export function createMockRegulation(
  overrides?: Partial<typeof mockRegulation>
) {
  return {
    ...mockRegulation,
    ...overrides,
  }
}

/**
 * Helper: Create mock version with overrides
 * @example
 * const version = createMockVersion({ versionNumber: 3 })
 */
export function createMockVersion(
  overrides?: Partial<RegulationVersionModel>
) {
  return {
    ...mockRegulationVersions[0],
    ...overrides,
  }
}
