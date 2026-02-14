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
/**
 * Evidence source for cost driver citation
 */
export interface EvidenceSource {
  type: 'REGULATION_CLAUSE' | 'INDUSTRY_BENCHMARK' | 'CASE_STUDY' | 'VENDOR_QUOTE' | 'ASSUMPTION';
  reference: string; // Clause number, benchmark ID, etc.
  confidence: number; // 0-1, how strong is this evidence
  estimatedCost?: number; // If evidence suggests specific cost
}

/**
 * Cost driver with evidence and department allocation
 */
export interface CostDriver {
  id: string;
  category: CostCategory;
  description: string;
  isOneTime: boolean;
  estimatedCost: number;
  confidence: number; // 0-1
  department: Department;
  // Phase 1: Evidence-backed extraction
  evidence?: EvidenceSource[];
  notes?: string;
  // Phase 1: AI-allocated alternatives
  departmentAlternatives?: Array<{
    department: Department;
    probability: number; // 0-1, likelihood this department is responsible
    reasoning?: string;
  }>;
}

/**
 * Department allocation with AI-powered breakdown
 */
export interface DepartmentAllocationDetail {
  oneTimeTasks: string[]; // Specific implementation tasks
  recurringTasks: string[]; // Ongoing responsibilities
  fteSplit?: {
    [role: string]: number; // e.g., { 'Senior Engineer': 0.5, 'Compliance Officer': 0.3 }
  };
  riskFactors?: string[]; // Potential challenges/risks
  sequencing?: string[]; // Order of implementation steps
}

/**
 * Department-level cost breakdown with AI allocation detail
 */
export interface DepartmentCostBreakdown {
  department: Department;
  oneTimeCost: number;
  recurringCostAnnual: number;
  fteImpact: number;
  budgetCode?: string;
  lineItems: CostDriver[];
  // Phase 1: AI-provided allocation details
  allocationDetail?: DepartmentAllocationDetail;
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
 * Phase 1: Sensitivity Analysis
 * Analyzes impact of parameter changes on cost estimate
 */
export interface SensitivityAnalysis {
  baselineOneTime: number;
  baselineRecurring: number;
  factors: Array<{
    factor: 'sizeMultiplier' | 'industryMultiplier' | 'geoMultiplier' | 'techMaturity';
    currentValue: number;
    impactOnOneTime: { low: number; high: number; percentChange: number }[];
    impactOnRecurring: { low: number; high: number; percentChange: number }[];
    recommendation?: string;
  }>;
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

/**
 * Phase 1: Multi-Scenario Modeling
 * Enhanced scenario analysis with sensitivity and alternatives
 */
export interface SensitivityScenario {
  scenarioName: string;
  parameters: Record<string, number>;
  oneTimeCostLow: number;
  oneTimeCostHigh: number;
  recurringCostAnnual: number;
  confidence: number;
}

/**
 * Phase 1: Portfolio Analytics
 * Aggregated insights across all estimates
 */
export interface PortfolioInsight {
  totalRegulations: number;
  totalComplexity: 'LOW' | 'MEDIUM' | 'HIGH';
  urgencyRanking: Array<{
    regulationTitle: string;
    estimatedCostImpact: number;
    riskLevel: RiskLevel;
    implementationWindow: number; // days
  }>;
  budgetingRecommendation?: string;
  prioritizedNextSteps: string[];
}

/**
 * Phase 1: Portfolio Trend Analysis
 */
export interface PortfolioTrend {
  totalOneTimeLow: number;
  totalOneTimeHigh: number;
  totalRecurringAnnual: number;
  estimateCount: number;
  averageConfidence: number;
  threeYearExposureLow: number;
  threeYearExposureHigh: number;
  costsByDepartment: Record<string, { oneTime: number; recurring: number }>;
  costsByRisk: Record<'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH', number>;
  topDrivers: Array<{
    description: string;
    category: string;
    totalCost: number;
    confidence: number;
  }>;
}

/**
 * Phase 1: Portfolio Forecast
 */
export interface PortfolioForecast {
  currentYear: {
    oneTimeLow: number;
    oneTimeHigh: number;
    recurringAnnual: number;
  };
  projections: Array<{
    year: number;
    oneTimeLow: number;
    oneTimeHigh: number;
    recurringAnnual: number;
    cumulative: number;
  }>;
  riskFactors: string[];
}
