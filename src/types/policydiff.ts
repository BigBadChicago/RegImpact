/**
 * PolicyDiff Module Types
 * Types for regulation change analysis and diffing
 */

/**
 * Result of comparing two text versions
 */
export interface DiffResult {
  added: string[];
  removed: string[];
  modified: string[];
  unchanged: string[];
}

/**
 * Sections of text that have changes
 */
export interface ChangeSections {
  addedSections: string[];
  removedSections: string[];
  modifiedSections: string[];
}

/**
 * Metrics about the changes
 */
export interface ChangeMetrics {
  linesAdded: number;
  linesRemoved: number;
  percentageChanged: number;
  totalLines: number;
}

/**
 * AI-generated summary of regulation changes
 */
export interface PolicyDiffSummary {
  summary: string;
  keyChanges: string[];
  obligations: string[];
  confidence: number;
}

/**
 * Significance level of changes
 */
export enum SignificanceScore {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

/**
 * Complete PolicyDiff record matching Prisma schema
 */
export interface PolicyDiffRecord {
  id: string;
  regulationVersionId: string;
  previousVersionId: string;
  diffText: string;
  summary: string;
  keyChanges: string[];
  significanceScore: SignificanceScore;
  aiConfidence: number;
  createdAt: Date;
}
