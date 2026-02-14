import {
  Industry,
  TechMaturity,
  Department,
  CostCategory,
  RiskLevel,
  type CompanyProfile,
  type CostDriver,
  type CostEstimate,
  type DepartmentCostBreakdown,
  type CostScenario,
  type ScenarioAnalysis,
} from '../../types/cost-estimate';
import {
  getCachedDrivers,
  setCachedDrivers,
  getCachedEstimate,
  setCachedEstimate,
  getCacheStats,
} from './cache';
import {
  extractCostDriversWithAI,
  allocateToDepartmentsWithAI,
} from './ai';

const AI_ENABLED = process.env.ENABLE_AI_COST_EXTRACTION === 'true';

const INDUSTRY_MULTIPLIERS: Record<Industry, number> = {
  [Industry.TECHNOLOGY]: 1.0,
  [Industry.HEALTHCARE]: 1.4,
  [Industry.FINANCE]: 1.3,
  [Industry.MANUFACTURING]: 1.1,
  [Industry.RETAIL]: 1.0,
  [Industry.OTHER]: 1.0,
};

const TECH_MATURITY_MULTIPLIERS: Record<TechMaturity, number> = {
  [TechMaturity.LOW]: 1.2,
  [TechMaturity.MEDIUM]: 1.0,
  [TechMaturity.HIGH]: 0.85,
};

function createCacheKey(text: string, suffix: string = ''): string {
  return `${text.substring(0, 100)}_${text.length}_${suffix}`;
}

export async function extractCostDrivers(
  regulationText: string,
  regulationTitle: string
): Promise<CostDriver[]> {
  const cacheKey = createCacheKey(regulationText, 'drivers');
  const cached = getCachedDrivers(cacheKey);

  if (cached) {
    console.log(`[CostEstimator] Cache HIT for cost drivers: ${regulationTitle}`);
    return cached;
  }

  console.log(`[CostEstimator] Cache MISS for cost drivers: ${regulationTitle}`);

  let drivers: CostDriver[] = [];
  if (AI_ENABLED) {
    try {
      drivers = await extractCostDriversWithAI(regulationText, regulationTitle);
    } catch (error) {
      console.error(
        '[CostEstimator] AI extraction failed, falling back to deterministic:',
        error
      );
      drivers = extractCostDriversDeterministic(regulationText);
    }
  } else {
    drivers = extractCostDriversDeterministic(regulationText);
  }

  setCachedDrivers(cacheKey, drivers);
  return drivers;
}

function extractCostDriversDeterministic(
  regulationText: string
): CostDriver[] {
  const text = regulationText.toLowerCase();
  const drivers: CostDriver[] = [];
  let driverId = 1;

  if (
    text.includes('portal') ||
    text.includes('system') ||
    text.includes('dsar') ||
    text.includes('setup')
  ) {
    drivers.push({
      id: `driver-det-${driverId++}`,
      category: CostCategory.SYSTEM_CHANGES,
      description: 'System changes and data request portal',
      isOneTime: true,
      estimatedCost: 30000,
      confidence: 0.7,
      department: Department.IT,
      evidence: [
        {
          type: 'INDUSTRY_BENCHMARK',
          reference: 'Privacy engineering benchmarks, 2024',
          confidence: 0.7,
          estimatedCost: 25000,
        },
      ],
    });
  }

  if (
    text.includes('officer') ||
    text.includes('dpo') ||
    text.includes('privacy officer')
  ) {
    drivers.push({
      id: `driver-det-${driverId++}`,
      category: CostCategory.PERSONNEL,
      description: 'Privacy officer / compliance personnel',
      isOneTime: false,
      estimatedCost: 65000,
      confidence: 0.8,
      department: Department.COMPLIANCE,
      evidence: [
        {
          type: 'INDUSTRY_BENCHMARK',
          reference: 'Compliance officer salary benchmark',
          confidence: 0.8,
          estimatedCost: 65000,
        },
      ],
    });
  }

  if (
    text.includes('audit') ||
    text.includes('assessment') ||
    text.includes('review')
  ) {
    drivers.push({
      id: `driver-det-${driverId++}`,
      category: CostCategory.AUDIT,
      description: 'Annual compliance audits and assessments',
      isOneTime: false,
      estimatedCost: 12000,
      confidence: 0.75,
      department: Department.COMPLIANCE,
      evidence: [
        {
          type: 'INDUSTRY_BENCHMARK',
          reference: 'Audit cost benchmark report',
          confidence: 0.75,
          estimatedCost: 12000,
        },
      ],
    });
  }

  if (
    text.includes('training') ||
    text.includes('education') ||
    text.includes('awareness')
  ) {
    drivers.push({
      id: `driver-det-${driverId++}`,
      category: CostCategory.TRAINING,
      description: 'Employee compliance training program',
      isOneTime: false,
      estimatedCost: 8000,
      confidence: 0.8,
      department: Department.HR,
      evidence: [
        {
          type: 'INDUSTRY_BENCHMARK',
          reference: 'Annual compliance training costs',
          confidence: 0.8,
          estimatedCost: 7500,
        },
      ],
    });
  }

  if (
    text.includes('legal') ||
    text.includes('counsel') ||
    text.includes('review')
  ) {
    drivers.push({
      id: `driver-det-${driverId++}`,
      category: CostCategory.LEGAL_REVIEW,
      description: 'Legal review and documentation updates',
      isOneTime: true,
      estimatedCost: 10000,
      confidence: 0.85,
      department: Department.LEGAL,
      evidence: [
        {
          type: 'VENDOR_QUOTE',
          reference: 'Legal review package estimate',
          confidence: 0.85,
          estimatedCost: 5000,
        },
      ],
    });
  }

  if (
    text.includes('fee') ||
    text.includes('penalty') ||
    text.includes('reporting')
  ) {
    drivers.push({
      id: `driver-det-${driverId++}`,
      category: CostCategory.OTHER,
      description: 'Annual reporting and compliance fees',
      isOneTime: false,
      estimatedCost: 5000,
      confidence: 0.75,
      department: Department.COMPLIANCE,
      evidence: [
        {
          type: 'ASSUMPTION',
          reference: 'Estimated annual fees based on regulation text patterns',
          confidence: 0.75,
        },
      ],
    });
  }

  console.log(
    `[CostEstimator] Extracted ${drivers.length} cost drivers (deterministic)`
  );
  return drivers;
}

export function calculateImplementationCost(
  drivers: CostDriver[],
  profile: CompanyProfile
): CostEstimate {
  const baseOneTimeCost = drivers
    .filter((d) => d.isOneTime)
    .reduce((sum, d) => sum + d.estimatedCost, 0);

  const baseRecurringCost = drivers
    .filter((d) => !d.isOneTime)
    .reduce((sum, d) => sum + d.estimatedCost, 0);

  let multiplier = 1.0;
  multiplier *= INDUSTRY_MULTIPLIERS[profile.industry];

  const sizeMultiplier = Math.pow(profile.employeeCount / 100, 0.7);
  multiplier *= sizeMultiplier;

  const geoMultiplier = 1 + (profile.geographicComplexity - 1) * 0.05;
  multiplier *= geoMultiplier;

  multiplier *= TECH_MATURITY_MULTIPLIERS[profile.techMaturity];

  const oneTimeCostMid = baseOneTimeCost * multiplier;
  const recurringCostAnnual = baseRecurringCost * multiplier;

  const defaultAvgConfidence = 0.7;
  const avgConfidence = drivers.length
    ? drivers.reduce((sum, d) => sum + d.confidence, 0) / drivers.length
    : defaultAvgConfidence;
  const confidenceSpread = drivers.length
    ? 0.2 * (1 - avgConfidence * 0.3)
    : 0;

  const oneTimeCostLow = oneTimeCostMid * (1 - confidenceSpread);
  const oneTimeCostHigh = oneTimeCostMid * (1 + confidenceSpread);

  const departmentBreakdown = allocateToDepartments(drivers, profile, multiplier);

  return {
    id: '',
    regulationVersionId: '',
    customerId: '',
    oneTimeCostLow: Math.round(oneTimeCostLow),
    oneTimeCostHigh: Math.round(oneTimeCostHigh),
    recurringCostAnnual: Math.round(recurringCostAnnual),
    costDrivers: drivers,
    departmentBreakdown,
    estimationMethod: AI_ENABLED ? 'AI_CALIBRATED' : 'DETERMINISTIC',
    confidence: avgConfidence,
    createdAt: new Date(),
  };
}

export function allocateToDepartments(
  drivers: CostDriver[],
  profile: CompanyProfile,
  multiplier: number = 1.0
): DepartmentCostBreakdown[] {
  const departments = [
    Department.LEGAL,
    Department.IT,
    Department.HR,
    Department.FINANCE,
    Department.OPERATIONS,
    Department.COMPLIANCE,
  ];

  return departments
    .map((dept) => {
      const deptDrivers = drivers.filter((d) => d.department === dept);

      if (deptDrivers.length === 0) {
        return null;
      }

      const baseOneTimeCost = deptDrivers
        .filter((d) => d.isOneTime)
        .reduce((sum, d) => sum + d.estimatedCost, 0);

      const baseRecurringCost = deptDrivers
        .filter((d) => !d.isOneTime)
        .reduce((sum, d) => sum + d.estimatedCost, 0);

      const oneTimeCost = baseOneTimeCost * multiplier;
      const recurringCostAnnual = baseRecurringCost * multiplier;

      const fteImpact = parseFloat(
        (recurringCostAnnual / 100000 + oneTimeCost / 200000).toFixed(2)
      );

      const deptCode = dept.substring(0, 4).toUpperCase();
      const budgetCode = `${deptCode}-COMP-001`;

      const breakdown: DepartmentCostBreakdown = {
        department: dept,
        oneTimeCost: Math.round(oneTimeCost),
        recurringCostAnnual: Math.round(recurringCostAnnual),
        fteImpact,
        budgetCode,
        lineItems: deptDrivers,
      };
      return breakdown;
    })
    .filter((d) => d !== null) as DepartmentCostBreakdown[];
}

export function generateScenarios(
  baseCost: { oneTimeCost: number; recurringCostAnnual: number },
  profile: CompanyProfile
): ScenarioAnalysis {
  const { oneTimeCost, recurringCostAnnual } = baseCost;

  const minimal: CostScenario = {
    name: 'Minimal Compliance',
    description: 'Basic compliance with manual processes',
    oneTimeCost: Math.round(oneTimeCost * 0.7),
    recurringCostAnnual: Math.round(recurringCostAnnual * 0.7),
    threeYearTotal: Math.round(oneTimeCost * 0.7 + recurringCostAnnual * 0.7 * 3),
    riskLevel: RiskLevel.MEDIUM,
    assumptions: [
      'Manual processes where possible',
      'Reactive compliance approach',
      'Minimal tooling investment',
    ],
  };

  const standard: CostScenario = {
    name: 'Standard Compliance',
    description: 'Recommended baseline compliance approach',
    oneTimeCost: Math.round(oneTimeCost),
    recurringCostAnnual: Math.round(recurringCostAnnual),
    threeYearTotal: Math.round(oneTimeCost + recurringCostAnnual * 3),
    riskLevel: RiskLevel.LOW,
    assumptions: [
      'Industry-standard tools and processes',
      'Proactive compliance monitoring',
      'Regular audits and assessments',
    ],
  };

  const bestInClass: CostScenario = {
    name: 'Best-in-Class',
    description: 'Industry-leading compliance program',
    oneTimeCost: Math.round(oneTimeCost * 1.4),
    recurringCostAnnual: Math.round(recurringCostAnnual * 1.4),
    threeYearTotal: Math.round(oneTimeCost * 1.4 + recurringCostAnnual * 1.4 * 3),
    riskLevel: RiskLevel.MINIMAL,
    assumptions: [
      'Premium compliance platforms',
      'Dedicated compliance team',
      'Continuous monitoring and improvement',
      'Third-party validation',
    ],
  };

  const delay90Days: CostScenario = {
    name: '90-Day Delay',
    description: 'Delayed implementation with potential penalties',
    oneTimeCost: Math.round(oneTimeCost * 1.25 + 15000),
    recurringCostAnnual: Math.round(recurringCostAnnual),
    threeYearTotal: Math.round(
      oneTimeCost * 1.25 + 15000 + recurringCostAnnual * 3
    ),
    riskLevel: RiskLevel.HIGH,
    assumptions: [
      'Rush implementation fees (+25%)',
      'Potential regulatory penalties (~$15K)',
      'Higher risk of violations',
    ],
  };

  let recommended: 'minimal' | 'standard' | 'bestInClass' | 'delay90Days' = 'standard';
  if (
    profile.riskAppetite === RiskLevel.LOW ||
    profile.riskAppetite === RiskLevel.MINIMAL
  ) {
    recommended = 'standard';
  } else if (profile.riskAppetite === RiskLevel.HIGH) {
    recommended = 'minimal';
  }

  if (
    profile.industry === Industry.FINANCE ||
    profile.industry === Industry.HEALTHCARE
  ) {
    recommended = 'standard';
  }

  return {
    minimal,
    standard,
    bestInClass,
    delay90Days,
    recommended,
  };
}

export async function estimateWithAI(
  regulationText: string,
  regulationTitle: string,
  profile: CompanyProfile
): Promise<CostEstimate> {
  const estimateKey = createCacheKey(
    `${regulationText}-${JSON.stringify(profile)}`,
    'estimate'
  );
  const cached = getCachedEstimate(estimateKey);
  if (cached) {
    return cached;
  }

  const drivers = await extractCostDrivers(regulationText, regulationTitle);
  const estimate = calculateImplementationCost(drivers, profile);

  let finalEstimate = estimate;
  if (AI_ENABLED && regulationText.length > 100) {
    try {
      const refinedBreakdown = await allocateToDepartmentsWithAI(
        drivers,
        profile,
        regulationTitle,
        estimate.departmentBreakdown
      );

      finalEstimate = {
        ...estimate,
        departmentBreakdown: refinedBreakdown,
      };
    } catch (error) {
      console.warn(
        '[CostEstimator] AI refinement failed, using base allocation:',
        error
      );
    }
  }

  setCachedEstimate(estimateKey, finalEstimate);
  return finalEstimate;
}

export function applyLearningFeedback(
  estimate: { oneTimeCostLow: number; oneTimeCostHigh: number; confidence: number },
  history: Array<{ estimated: number; actual: number; variance: number }>
): { oneTimeCostLow: number; oneTimeCostHigh: number; confidence: number } {
  if (history.length === 0) {
    return estimate;
  }

  const avgVariance =
    history.reduce((sum, h) => sum + h.variance, 0) / history.length;

  const adjustedLow = estimate.oneTimeCostLow * (1 + avgVariance);
  const adjustedHigh = estimate.oneTimeCostHigh * (1 + avgVariance);

  const narrowingFactor = Math.max(0.5, 1 - history.length / 100);
  const spread = adjustedHigh - adjustedLow;
  const newSpread = Math.max(spread * narrowingFactor, adjustedLow * 0.1);

  const finalLow = adjustedLow;
  const finalHigh = adjustedLow + newSpread;

  const varianceStdDev = Math.sqrt(
    history.reduce((sum, h) => sum + Math.pow(h.variance - avgVariance, 2), 0) /
      history.length
  );
  const confidenceBoost = Math.min(0.2, (1 - varianceStdDev) * 0.2);
  const newConfidence = Math.min(0.95, estimate.confidence + confidenceBoost);

  return {
    oneTimeCostLow: Math.round(finalLow),
    oneTimeCostHigh: Math.round(finalHigh),
    confidence: parseFloat(newConfidence.toFixed(2)),
  };
}

export { getCacheStats };
