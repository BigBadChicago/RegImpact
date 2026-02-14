/**
 * Cost Estimate Module Types
 * Types for regulatory cost estimation and financial impact analysis
 */

/**
 * Industry type for company profile
 */
export enum Industry {
  TECHNOLOGY = 'TECHNOLOGY',
  HEALTHCARE = 'HEALTHCARE',
  FINANCE = 'FINANCE',
  MANUFACTURING = 'MANUFACTURING',
  RETAIL = 'RETAIL',
  OTHER = 'OTHER',
}

/**
 * Technology maturity level
 */
export enum TechMaturity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

/**
 * Department categories
 */
export enum Department {
  LEGAL = 'LEGAL',
  IT = 'IT',
  HR = 'HR',
  FINANCE = 'FINANCE',
  OPERATIONS = 'OPERATIONS',
  COMPLIANCE = 'COMPLIANCE',
}

/**
 * Cost driver category
 */
export enum CostCategory {
  LEGAL_REVIEW = 'LEGAL_REVIEW',
  SYSTEM_CHANGES = 'SYSTEM_CHANGES',
  TRAINING = 'TRAINING',
  CONSULTING = 'CONSULTING',
  AUDIT = 'AUDIT',
  PERSONNEL = 'PERSONNEL',
  INFRASTRUCTURE = 'INFRASTRUCTURE',
  OTHER = 'OTHER',
}

/**
 * Risk level assessment
 */
export enum RiskLevel {
  MINIMAL = 'MINIMAL',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

/**
 * Company profile for cost calibration
 */
export interface CompanyProfile {
  industry: Industry;
  employeeCount: number;
  revenue?: number;
  geographicComplexity: number; // Number of states/jurisdictions
  techMaturity: TechMaturity;
  riskAppetite?: RiskLevel;
}

/**
 * Individual cost driver identified from regulation
 */
export interface CostDriver {
  id: string;
  category: CostCategory;
  description: string;
  isOneTime: boolean;
  estimatedCost: number;
  confidence: number; // 0-1
  department: Department;
}

/**
 * Department-level cost breakdown
 */
export interface DepartmentCostBreakdown {
  department: Department;
  oneTimeCost: number;
  recurringCostAnnual: number;
  fteImpact: number;
  budgetCode?: string;
  lineItems: CostDriver[];
}

/**
 * Cost scenario analysis
 */
export interface CostScenario {
  name: string;
  description: string;
  oneTimeCost: number;
  recurringCostAnnual: number;
  threeYearTotal: number;
  riskLevel: RiskLevel;
  assumptions: string[];
}

/**
 * Complete scenario analysis with recommendations
 */
export interface ScenarioAnalysis {
  minimal: CostScenario;
  standard: CostScenario;
  bestInClass: CostScenario;
  delay90Days: CostScenario;
  recommended: 'minimal' | 'standard' | 'bestInClass' | 'delay90Days';
}

/**
 * Complete cost estimate with all analysis
 */
export interface CostEstimate {
  id: string;
  regulationVersionId: string;
  customerId: string;
  
  // Cost ranges
  oneTimeCostLow: number;
  oneTimeCostHigh: number;
  recurringCostAnnual: number;
  
  // Detailed breakdown
  costDrivers: CostDriver[];
  departmentBreakdown: DepartmentCostBreakdown[];
  
  // Metadata
  estimationMethod: string;
  confidence: number;
  createdAt: Date;
}

/**
 * Cost estimate request parameters
 */
export interface CostEstimateRequest {
  regulationVersionId: string;
  companyProfile?: CompanyProfile;
  useAI?: boolean;
}

/**
 * Actual cost feedback for learning
 */
export interface CostFeedback {
  costEstimateId: string;
  actualOneTimeCost: number;
  actualRecurringCostAnnual: number;
  varianceNotes?: string;
  submittedBy: string;
  submittedAt: Date;
}

/**
 * Cost estimation context with regulation details
 */
export interface EstimationContext {
  regulationTitle: string;
  regulationText: string;
  effectiveDate?: Date;
  companyProfile: CompanyProfile;
}
