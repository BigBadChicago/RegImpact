/**
 * Mock test data for cost estimates
 * Used for testing cost estimation and financial impact analysis
 */

import {
  Industry,
  TechMaturity,
  Department,
  CostCategory,
  RiskLevel,
  type CompanyProfile,
  type CostDriver,
  type DepartmentCostBreakdown,
  type ScenarioAnalysis,
  type CostEstimate,
} from '@/types/cost-estimate';

/**
 * Mock company profiles for different scenarios
 */
export const mockCompanyProfiles: Record<string, CompanyProfile> = {
  techStartup: {
    industry: Industry.TECHNOLOGY,
    employeeCount: 50,
    revenue: 5_000_000,
    geographicComplexity: 2, // CA + NY
    techMaturity: TechMaturity.HIGH,
    riskAppetite: RiskLevel.MEDIUM,
  },
  healthcareMidsize: {
    industry: Industry.HEALTHCARE,
    employeeCount: 250,
    revenue: 50_000_000,
    geographicComplexity: 5,
    techMaturity: TechMaturity.MEDIUM,
    riskAppetite: RiskLevel.LOW,
  },
  financeEnterprise: {
    industry: Industry.FINANCE,
    employeeCount: 1000,
    revenue: 500_000_000,
    geographicComplexity: 2, // Same as techStartup for size comparison
    techMaturity: TechMaturity.HIGH,
    riskAppetite: RiskLevel.LOW,
  },
  manufacturingMidsize: {
    industry: Industry.MANUFACTURING,
    employeeCount: 500,
    revenue: 75_000_000,
    geographicComplexity: 10,
    techMaturity: TechMaturity.LOW,
    riskAppetite: RiskLevel.MEDIUM,
  },
  retailSmall: {
    industry: Industry.RETAIL,
    employeeCount: 100,
    revenue: 10_000_000,
    geographicComplexity: 3,
    techMaturity: TechMaturity.MEDIUM,
    riskAppetite: RiskLevel.HIGH,
  },
};

/**
 * Mock cost drivers for privacy regulation (CPRA-style)
 */
export const mockPrivacyCostDrivers: CostDriver[] = [
  {
    id: 'driver-1',
    category: CostCategory.LEGAL_REVIEW,
    description: 'Privacy policy review and updates',
    isOneTime: true,
    estimatedCost: 5000,
    confidence: 0.9,
    department: Department.LEGAL,
  },
  {
    id: 'driver-2',
    category: CostCategory.SYSTEM_CHANGES,
    description: 'Data mapping and inventory system',
    isOneTime: true,
    estimatedCost: 25000,
    confidence: 0.75,
    department: Department.IT,
  },
  {
    id: 'driver-3',
    category: CostCategory.SYSTEM_CHANGES,
    description: 'Consumer rights request portal',
    isOneTime: true,
    estimatedCost: 35000,
    confidence: 0.7,
    department: Department.IT,
  },
  {
    id: 'driver-4',
    category: CostCategory.TRAINING,
    description: 'Privacy training for all employees',
    isOneTime: false,
    estimatedCost: 8000,
    confidence: 0.85,
    department: Department.HR,
  },
  {
    id: 'driver-5',
    category: CostCategory.PERSONNEL,
    description: 'Data Protection Officer (0.5 FTE)',
    isOneTime: false,
    estimatedCost: 60000,
    confidence: 0.8,
    department: Department.COMPLIANCE,
  },
  {
    id: 'driver-6',
    category: CostCategory.CONSULTING,
    description: 'External privacy assessment',
    isOneTime: true,
    estimatedCost: 15000,
    confidence: 0.9,
    department: Department.LEGAL,
  },
  {
    id: 'driver-7',
    category: CostCategory.AUDIT,
    description: 'Annual privacy compliance audit',
    isOneTime: false,
    estimatedCost: 12000,
    confidence: 0.85,
    department: Department.COMPLIANCE,
  },
];

/**
 * Mock cost drivers for employment regulation
 */
export const mockEmploymentCostDrivers: CostDriver[] = [
  {
    id: 'driver-e1',
    category: CostCategory.SYSTEM_CHANGES,
    description: 'Payroll system updates',
    isOneTime: true,
    estimatedCost: 10000,
    confidence: 0.85,
    department: Department.HR,
  },
  {
    id: 'driver-e2',
    category: CostCategory.TRAINING,
    description: 'Manager training on new leave policies',
    isOneTime: true,
    estimatedCost: 5000,
    confidence: 0.9,
    department: Department.HR,
  },
  {
    id: 'driver-e3',
    category: CostCategory.PERSONNEL,
    description: 'Increased labor costs (sick leave)',
    isOneTime: false,
    estimatedCost: 40000,
    confidence: 0.7,
    department: Department.OPERATIONS,
  },
  {
    id: 'driver-e4',
    category: CostCategory.LEGAL_REVIEW,
    description: 'Policy review and employee handbook update',
    isOneTime: true,
    estimatedCost: 3000,
    confidence: 0.95,
    department: Department.LEGAL,
  },
];

/**
 * Mock department breakdown for privacy regulation
 */
export const mockDepartmentBreakdown: DepartmentCostBreakdown[] = [
  {
    department: Department.LEGAL,
    oneTimeCost: 20000,
    recurringCostAnnual: 0,
    fteImpact: 0.1,
    budgetCode: 'LEGAL-COMP-001',
    lineItems: mockPrivacyCostDrivers.filter((d) => d.department === Department.LEGAL),
  },
  {
    department: Department.IT,
    oneTimeCost: 60000,
    recurringCostAnnual: 5000,
    fteImpact: 0.2,
    budgetCode: 'IT-COMP-001',
    lineItems: mockPrivacyCostDrivers.filter((d) => d.department === Department.IT),
  },
  {
    department: Department.HR,
    oneTimeCost: 8000,
    recurringCostAnnual: 8000,
    fteImpact: 0.15,
    budgetCode: 'HR-COMP-001',
    lineItems: mockPrivacyCostDrivers.filter((d) => d.department === Department.HR),
  },
  {
    department: Department.COMPLIANCE,
    oneTimeCost: 0,
    recurringCostAnnual: 72000,
    fteImpact: 0.5,
    budgetCode: 'COMP-001',
    lineItems: mockPrivacyCostDrivers.filter((d) => d.department === Department.COMPLIANCE),
  },
];

/**
 * Mock scenario analysis for privacy regulation
 */
export const mockScenarioAnalysis: ScenarioAnalysis = {
  minimal: {
    name: 'Minimal Compliance',
    description: 'Basic compliance with manual processes',
    oneTimeCost: 40000,
    recurringCostAnnual: 50000,
    threeYearTotal: 190000,
    riskLevel: RiskLevel.MEDIUM,
    assumptions: [
      'Manual data request handling',
      'Basic privacy policy updates only',
      'No dedicated DPO',
      'Reactive approach to compliance',
    ],
  },
  standard: {
    name: 'Standard Compliance',
    description: 'Recommended baseline compliance approach',
    oneTimeCost: 88000,
    recurringCostAnnual: 85000,
    threeYearTotal: 343000,
    riskLevel: RiskLevel.LOW,
    assumptions: [
      'Automated data request portal',
      'Comprehensive data inventory',
      'Part-time DPO (0.5 FTE)',
      'Annual compliance audits',
    ],
  },
  bestInClass: {
    name: 'Best-in-Class',
    description: 'Industry-leading privacy program',
    oneTimeCost: 125000,
    recurringCostAnnual: 120000,
    threeYearTotal: 485000,
    riskLevel: RiskLevel.MINIMAL,
    assumptions: [
      'Full privacy management platform',
      'Real-time data discovery',
      'Full-time DPO',
      'Quarterly external audits',
      'Privacy-by-design integration',
    ],
  },
  delay90Days: {
    name: '90-Day Delay',
    description: 'Delayed implementation with potential penalties',
    oneTimeCost: 110000,
    recurringCostAnnual: 85000,
    threeYearTotal: 380000,
    riskLevel: RiskLevel.HIGH,
    assumptions: [
      'Rush implementation fees (+25%)',
      'Potential regulatory penalties ($15K)',
      'Same ongoing costs as standard',
      'Higher risk of violations',
    ],
  },
  recommended: 'standard',
};

/**
 * Mock complete cost estimate
 */
export const mockCostEstimate: CostEstimate = {
  id: 'cost-estimate-1',
  regulationVersionId: 'regulation-version-1',
  customerId: 'customer-1',
  oneTimeCostLow: 75000,
  oneTimeCostHigh: 100000,
  recurringCostAnnual: 85000,
  costDrivers: mockPrivacyCostDrivers,
  departmentBreakdown: mockDepartmentBreakdown,
  estimationMethod: 'AI_CALIBRATED',
  confidence: 0.8,
  createdAt: new Date('2025-12-15'),
};

/**
 * Vendor pricing database (mock)
 */
export const mockVendorPricing = {
  privacyManagementPlatform: {
    oneTrust: { setup: 25000, annual: 36000 },
    trustarc: { setup: 20000, annual: 30000 },
    bigID: { setup: 30000, annual: 42000 },
  },
  consultingHourlyRates: {
    privacyLawyer: 350,
    privacyConsultant: 250,
    technicalArchitect: 200,
  },
  auditCosts: {
    smallCompany: 8000,
    midsize: 15000,
    enterprise: 35000,
  },
};

/**
 * Helper: Calculate total one-time costs
 */
export function calculateTotalOneTimeCost(drivers: CostDriver[]): number {
  return drivers
    .filter((d) => d.isOneTime)
    .reduce((sum, d) => sum + d.estimatedCost, 0);
}

/**
 * Helper: Calculate total recurring costs
 */
export function calculateTotalRecurringCost(drivers: CostDriver[]): number {
  return drivers
    .filter((d) => !d.isOneTime)
    .reduce((sum, d) => sum + d.estimatedCost, 0);
}

/**
 * Helper: Generate mock cost estimate with custom parameters
 */
export function createMockCostEstimate(
  overrides: Partial<CostEstimate> = {}
): CostEstimate {
  return {
    ...mockCostEstimate,
    ...overrides,
  };
}

/**
 * Helper: Generate mock company profile
 */
export function createMockCompanyProfile(
  overrides: Partial<CompanyProfile> = {}
): CompanyProfile {
  return {
    ...mockCompanyProfiles.techStartup,
    ...overrides,
  };
}
