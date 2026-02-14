import type { DeadlineModel } from '../../generated/prisma/models'
import type { DeadlineRiskLevel } from '../../generated/prisma/enums'

/**
 * TypeScript types for Deadline Management
 * These types extend the Prisma-generated models with UI/business logic types
 */

/**
 * Deadline candidate extracted from text (before validation)
 * Used during the extraction phase before creating Deadline records
 */
export interface DeadlineCandidate {
  /** Extracted date */
  date: Date
  /** Surrounding text context */
  context: string
  /** Confidence score (0-1) indicating extraction accuracy */
  confidence: number
}

/**
 * Risk level enum for deadline categorization
 * Exported from Prisma schema but aliased here for convenience
 */
export type RiskLevel = DeadlineRiskLevel

/**
 * Standard Deadline model from Prisma
 * Re-exported for convenience
 */
export type Deadline = DeadlineModel

/**
 * Deadline with related regulation and jurisdiction details
 * Used in API responses and UI components
 */
export interface DeadlineWithDetails extends DeadlineModel {
  regulationVersion: {
    id: string
    versionNumber: number
    regulation: {
      id: string
      title: string
      regulationType: string
      jurisdiction: {
        id: string
        code: string
        name: string
        type: string
      }
    }
  }
}

/**
 * Deadline with computed days remaining
 * Used in UI table components
 */
export interface DeadlineWithDaysRemaining extends DeadlineWithDetails {
  daysRemaining: number
}

/**
 * Deadline extraction request payload
 */
export interface DeadlineExtractionRequest {
  versionId: string
  useAI?: boolean // Whether to use AI extraction (default: true if regex fails)
}

/**
 * Deadline extraction response
 */
export interface DeadlineExtractionResponse {
  deadlines: Deadline[]
  extractionMethod: 'regex' | 'ai' | 'hybrid'
  extractedCount: number
  message: string
}

/**
 * Deadline list request query parameters
 */
export interface DeadlineListParams {
  customerId: string
  daysAhead?: number // Default: 90
  riskLevel?: RiskLevel
  jurisdictionCode?: string
  sortBy?: 'deadlineDate' | 'riskLevel'
  sortOrder?: 'asc' | 'desc'
}

/**
 * Deadline list response
 */
export interface DeadlineListResponse {
  deadlines: DeadlineWithDaysRemaining[]
  totalCount: number
  criticalCount: number
  importantCount: number
  routineCount: number
}

/**
 * AI extraction result from OpenAI
 * Matches the expected JSON response from the AI
 */
export interface AIDeadlineExtraction {
  deadlineDate: string // ISO date string
  deadlineType: string
  description: string
  riskLevel: RiskLevel
  confidence?: number
}

/**
 * Calendar event for ICS export
 */
export interface CalendarEvent {
  title: string
  startDate: Date
  description: string
  alarmBefore?: number // Minutes before to set alarm
  location?: string
  url?: string
}

/**
 * Deadline statistics for dashboard
 */
export interface DeadlineStatistics {
  totalUpcoming: number
  criticalCount: number
  importantCount: number
  routineCount: number
  overdueCount: number
  thisWeekCount: number
  thisMonthCount: number
  nextQuarterCount: number
}

/**
 * Risk categorization configuration
 */
export interface RiskCategorization {
  criticalKeywords: string[]
  importantKeywords: string[]
  criticalDaysThreshold: number // < this many days = CRITICAL
  importantDaysThreshold: number // < this many days = IMPORTANT
}

/**
 * Default risk categorization settings
 */
export const DEFAULT_RISK_CATEGORIZATION: RiskCategorization = {
  criticalKeywords: [
    'penalty',
    'fine',
    'violation',
    'immediate',
    'urgent',
    'mandatory',
    'required',
    'must',
    'shall',
    'criminal',
    'enforcement',
  ],
  importantKeywords: [
    'should',
    'deadline',
    'filing',
    'submission',
    'report',
    'certification',
  ],
  criticalDaysThreshold: 30,
  importantDaysThreshold: 60,
}
