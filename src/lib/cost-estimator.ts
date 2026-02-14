/**
 * Cost Estimation Service
 * AI-powered regulatory compliance cost estimation with company-specific calibration
 * Implements aggressive caching to minimize costs (~$0.004-0.006 per estimate)
 */

import OpenAI from 'openai';
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
} from '@/types/cost-estimate';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// Enable AI extraction via environment variable (for cost control)
const AI_ENABLED = process.env.ENABLE_AI_COST_EXTRACTION === 'true';

// In-memory cache for cost estimation results
const costDriverCache = new Map<string, CostDriver[]>();
const estimateCache = new Map<string, CostEstimate>();

// Industry multipliers based on regulatory complexity
const INDUSTRY_MULTIPLIERS: Record<Industry, number> = {
  [Industry.TECHNOLOGY]: 1.0,
  [Industry.HEALTHCARE]: 1.4,
  [Industry.FINANCE]: 1.3,
  [Industry.MANUFACTURING]: 1.1,
  [Industry.RETAIL]: 1.0,
  [Industry.OTHER]: 1.0,
};

// Tech maturity discounts (higher maturity = lower implementation costs)
const TECH_MATURITY_MULTIPLIERS: Record<TechMaturity, number> = {
  [TechMaturity.LOW]: 1.2,
  [TechMaturity.MEDIUM]: 1.0,
  [TechMaturity.HIGH]: 0.85,
};

/**
 * Create cache key from text input
 */
function createCacheKey(text: string, suffix: string = ''): string {
  return `${text.substring(0, 100)}_${text.length}_${suffix}`;
}

/**
 * Implement exponential backoff retry logic
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`[CostEstimator] Retry attempt ${attempt + 1} after ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Extract cost drivers from regulation text using AI or deterministic logic
 */
export async function extractCostDrivers(
  regulationText: string,
  regulationTitle: string
): Promise<CostDriver[]> {
  const cacheKey = createCacheKey(regulationText, 'drivers');

  // Check cache first
  if (costDriverCache.has(cacheKey)) {
    console.log(`[CostEstimator] Cache HIT for cost drivers: ${regulationTitle}`);
    return costDriverCache.get(cacheKey)!;
  }

  console.log(`[CostEstimator] Cache MISS for cost drivers: ${regulationTitle}`);

  if (AI_ENABLED) {
    return await extractCostDriversWithAI(regulationText, regulationTitle);
  } else {
    return extractCostDriversDeterministic(regulationText);
  }
}

/**
 * AI-powered cost driver extraction (behind feature flag)
 */
async function extractCostDriversWithAI(
  regulationText: string,
  regulationTitle: string
): Promise<CostDriver[]> {
  try {
    const truncatedText =
      regulationText.length > 1500
        ? regulationText.substring(0, 1500) + '...'
        : regulationText;

    console.log(`[CostEstimator] AI extraction (~$0.002-0.004 cost)`);

    const response = await retryWithBackoff(() =>
      openai.chat.completions.create({
        model: 'gpt-4-turbo',
        temperature: 0.2,
        max_tokens: 1500,
        messages: [
          {
            role: 'system',
            content: `You are a regulatory compliance cost analyst. Extract cost drivers from regulations and output ONLY valid JSON.`,
          },
          {
            role: 'user',
            content: `Analyze this regulation and identify all cost drivers (implementation requirements that have financial impact).

Regulation: ${regulationTitle}
Text: ${truncatedText}

For each cost driver, identify:
- category (LEGAL_REVIEW, SYSTEM_CHANGES, TRAINING, CONSULTING, AUDIT, PERSONNEL, INFRASTRUCTURE, OTHER)
- description (brief, specific)
- isOneTime (true/false)
- estimatedCost (USD, reasonable estimate)
- confidence (0-1)
- department (LEGAL, IT, HR, FINANCE, OPERATIONS, COMPLIANCE)

Respond ONLY with valid JSON:
{
  "drivers": [
    {
      "category": "SYSTEM_CHANGES",
      "description": "Data subject access request portal",
      "isOneTime": true,
      "estimatedCost": 35000,
      "confidence": 0.75,
      "department": "IT"
    }
  ]
}`,
          },
        ],
      })
    );

    const content = response.choices[0]?.message?.content || '{}';
    
    // Parse JSON response (handling markdown code blocks)
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    const parsed = JSON.parse(jsonStr);
    const drivers: CostDriver[] = (parsed.drivers || []).map(
      (d: Record<string, unknown>, index: number) => ({
        id: `driver-ai-${index + 1}`,
        category: d.category as CostCategory,
        description: d.description,
        isOneTime: d.isOneTime,
        estimatedCost: d.estimatedCost,
        confidence: d.confidence,
        department: d.department as Department,
      })
    );

    // Cache result
    const cacheKey = createCacheKey(regulationText, 'drivers');
    costDriverCache.set(cacheKey, drivers);

    console.log(`[CostEstimator] Extracted ${drivers.length} cost drivers via AI`);
    return drivers;
  } catch (error) {
    console.error(`[CostEstimator] AI extraction failed, falling back to deterministic:`, error);
    return extractCostDriversDeterministic(regulationText);
  }
}

/**
 * Deterministic cost driver extraction (fallback/default)
 */
function extractCostDriversDeterministic(
  regulationText: string
): Promise<CostDriver[]> {
  const text = regulationText.toLowerCase();
  const drivers: CostDriver[] = [];
  let driverId = 1;

  // Pattern matching for common requirements
  if (text.includes('portal') || text.includes('system') || text.includes('dsar') || text.includes('setup')) {
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
          reference: 'Privacy regulation compliance - Portal development typical cost',
          confidence: 0.7,
          estimatedCost: 25000,
        },
      ],
      notes: 'Portal development typically includes user authentication, data export, and audit logging',
    });
  }

  if (text.includes('officer') || text.includes('dpo') || text.includes('designat')) {
    drivers.push({
      id: `driver-det-${driverId++}`,
      category: CostCategory.PERSONNEL,
      description: 'Privacy/compliance officer designation',
      isOneTime: false,
      estimatedCost: 60000,
      confidence: 0.8,
      department: Department.COMPLIANCE,
      evidence: [
        {
          type: 'INDUSTRY_BENCHMARK',
          reference: 'Privacy officer salary benchmark - Mid-market companies',
          confidence: 0.8,
          estimatedCost: 65000,
        },
      ],
      notes: 'Annual FTE equivalent for compliance officer role',
    });
  }

  if (text.includes('audit') || text.includes('assessment')) {
    drivers.push({
      id: `driver-det-${driverId++}`,
      category: CostCategory.AUDIT,
      description: 'Compliance audits and assessments',
      isOneTime: false,
      estimatedCost: 12000,
      confidence: 0.85,
      department: Department.COMPLIANCE,
      evidence: [
        {
          type: 'INDUSTRY_BENCHMARK',
          reference: 'Internal audit program - Annual cost estimate',
          confidence: 0.85,
          estimatedCost: 12000,
        },
      ],
      notes: 'Annual audit and assessment activities including internal reviews',
    });
  }

  if (text.includes('training') || text.includes('education')) {
    drivers.push({
      id: `driver-det-${driverId++}`,
      category: CostCategory.TRAINING,
      description: 'Employee training and education',
      isOneTime: false,
      estimatedCost: 8000,
      confidence: 0.85,
      department: Department.HR,
      evidence: [
        {
          type: 'INDUSTRY_BENCHMARK',
          reference: 'Compliance training program - Annual per employee',
          confidence: 0.85,
          estimatedCost: 7500,
        },
      ],
      notes: 'Employee training on regulatory requirements and compliance procedures',
    });
  }

  if (text.includes('policy') || text.includes('legal review')) {
    drivers.push({
      id: `driver-det-${driverId++}`,
      category: CostCategory.LEGAL_REVIEW,
      description: 'Policy review and legal compliance analysis',
      isOneTime: true,
      estimatedCost: 5000,
      confidence: 0.9,
      department: Department.LEGAL,
      evidence: [
        {
          type: 'VENDOR_QUOTE',
          reference: 'Legal services - Policy review and compliance analysis',
          confidence: 0.9,
          estimatedCost: 5000,
        },
      ],
      notes: 'Legal review to ensure policies comply with regulation requirements',
    });
  }

  // Check for annual/recurring fee patterns
  if (text.includes('annual') || text.includes('yearly') || text.includes('each year') || text.includes('reporting fee')) {
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

  // Always cache deterministic results too
  const cacheKey = createCacheKey(regulationText, 'drivers');
  costDriverCache.set(cacheKey, drivers);

  console.log(`[CostEstimator] Extracted ${drivers.length} cost drivers (deterministic)`);
  return Promise.resolve(drivers);
}

/**
 * Calculate implementation cost with company-specific calibration
 */
export function calculateImplementationCost(
  drivers: CostDriver[],
  profile: CompanyProfile
): CostEstimate {
  // Base costs from drivers
  const baseOneTimeCost = drivers
    .filter((d) => d.isOneTime)
    .reduce((sum, d) => sum + d.estimatedCost, 0);

  const baseRecurringCost = drivers
    .filter((d) => !d.isOneTime)
    .reduce((sum, d) => sum + d.estimatedCost, 0);

  // Apply multipliers
  let multiplier = 1.0;

  // Industry complexity
  multiplier *= INDUSTRY_MULTIPLIERS[profile.industry];

  // Size (non-linear scaling)
  const sizeMultiplier = Math.pow(profile.employeeCount / 100, 0.7); // Economies of scale
  multiplier *= sizeMultiplier;

  // Geographic complexity (~5% per additional state beyond first)
  const geoMultiplier = 1 + (profile.geographicComplexity - 1) * 0.05;
  multiplier *= geoMultiplier;

  // Tech maturity
  multiplier *= TECH_MATURITY_MULTIPLIERS[profile.techMaturity];

  // Calculate costs with multipliers
  const oneTimeCostMid = baseOneTimeCost * multiplier;
  const recurringCostAnnual = baseRecurringCost * multiplier;

  // Generate confidence ranges (±20% default, narrower with higher confidence)
  const avgConfidence =
    drivers.reduce((sum, d) => sum + d.confidence, 0) / drivers.length;
  const confidenceSpread = 0.2 * (1 - avgConfidence * 0.3); // Higher confidence = narrower band

  const oneTimeCostLow = oneTimeCostMid * (1 - confidenceSpread);
  const oneTimeCostHigh = oneTimeCostMid * (1 + confidenceSpread);

  // Allocate to departments (pass multiplier to apply same scaling)
  const departmentBreakdown = allocateToDepartments(drivers, profile, multiplier);

  return {
    id: '', // Will be set when saving to DB
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

/**
 * AI-powered department allocation with detailed breakdown
 * Refines initial allocation based on regulation context and company profile
 */
async function allocateToDepartmentsWithAI(
  drivers: CostDriver[],
  profile: CompanyProfile,
  regulationTitle: string
): Promise<DepartmentCostBreakdown[]> {
  try {
    const baseBreakdown = allocateToDepartments(drivers, profile);

    console.log(`[CostEstimator] AI department allocation (~$0.002-0.003 cost)`);

    const response = await retryWithBackoff(() =>
      openai.chat.completions.create({
        model: 'gpt-4-turbo',
        temperature: 0.3,
        max_tokens: 2000,
        messages: [
          {
            role: 'system',
            content: `You are a compliance cost allocation expert. Refine cost driver allocation to departments based on regulation context and company profile. Output ONLY valid JSON.`,
          },
          {
            role: 'user',
            content: `Regulation: ${regulationTitle}
Company: ${profile.industry} industry, ${profile.employeeCount} employees

Current allocation:
${JSON.stringify(baseBreakdown, null, 2)}

Based on the regulation requirements and company profile:
1. Are there alternative department allocations?
2. What specific tasks should each department perform?
3. What FTE breakdown makes sense?
4. What are key risks/sequencing concerns?

Respond with JSON:
{
  "refinements": [
    {
      "department": "IT|HR|LEGAL|COMPLIANCE|FINANCE|OPERATIONS",
      "allocationDetail": {
        "oneTimeTasks": ["task 1", "task 2"],
        "recurringTasks": ["task 1"],
        "fteSplit": {"Senior Engineer": 0.5, "Analyst": 0.3},
        "riskFactors": ["risk 1"],
        "sequencing": ["step 1", "step 2"]
      }
    }
  ]
}`,
          },
        ],
      })
    );

    const content = response.choices[0]?.message?.content || '{}';
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    const parsed = JSON.parse(jsonStr);
    const refinements = parsed.refinements || [];

    // Apply refinements to breakdown
    const refinedBreakdown = baseBreakdown.map((dept) => {
      const refinement = refinements.find(
        (r: Record<string, unknown>) => r.department === dept.department
      );
      if (refinement?.allocationDetail) {
        return {
          ...dept,
          allocationDetail: refinement.allocationDetail,
        };
      }
      return dept;
    });

    console.log(`[CostEstimator] AI refined allocation for ${refinedBreakdown.length} departments`);
    return refinedBreakdown;
  } catch (error) {
    console.error(`[CostEstimator] AI allocation failed, using base allocation:`, error);
    return allocateToDepartments(drivers, profile);
  }
}

/**
 * Allocate costs to departments
 */
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

      // Apply the same multiplier used in overall calculation
      const oneTimeCost = baseOneTimeCost * multiplier;
      const recurringCostAnnual = baseRecurringCost * multiplier;

      // Estimate FTE impact (rough heuristic: $100K = 1 FTE)
      const fteImpact = parseFloat(
        (recurringCostAnnual / 100000 + oneTimeCost / 200000).toFixed(2)
      );

      // Generate budget code
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

/**
 * Generate scenario analysis (minimal, standard, best-in-class, delay)
 */
export function generateScenarios(
  baseCost: { oneTimeCost: number; recurringCostAnnual: number },
  profile: CompanyProfile
): ScenarioAnalysis {
  const { oneTimeCost, recurringCostAnnual } = baseCost;

  // Minimal compliance (70% cost, medium risk)
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

  // Standard compliance (100% cost, low risk)
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

  // Best-in-class (140% cost, minimal risk)
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

  // 90-day delay (rush fees + penalties)
  const delay90Days: CostScenario = {
    name: '90-Day Delay',
    description: 'Delayed implementation with potential penalties',
    oneTimeCost: Math.round(oneTimeCost * 1.25 + 15000), // Rush fee + penalty
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

  // Recommend based on risk appetite
  let recommended: 'minimal' | 'standard' | 'bestInClass' | 'delay90Days' = 'standard';
  if (profile.riskAppetite === RiskLevel.LOW || profile.riskAppetite === RiskLevel.MINIMAL) {
    recommended = 'standard';
  } else if (profile.riskAppetite === RiskLevel.HIGH) {
    recommended = 'minimal';
  }

  // Finance and healthcare should lean toward standard/best
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

/**
 * Full AI-powered estimate (single-shot)
 */
export async function estimateWithAI(
  regulationText: string,
  regulationTitle: string,
  profile: CompanyProfile
): Promise<CostEstimate> {
  // Extract cost drivers (uses AI if enabled)
  const drivers = await extractCostDrivers(regulationText, regulationTitle);

  // Calculate base estimate with calibration
  const estimate = calculateImplementationCost(drivers, profile);

  // Phase 1: AI-powered department allocation refinement
  if (AI_ENABLED && regulationText.length > 100) {
    try {
      // Get AI-refined department breakdown
      const refinedBreakdown = await allocateToDepartmentsWithAI(
        drivers,
        profile,
        regulationTitle
      );
      
      // Update estimate with refined breakdown
      return {
        ...estimate,
        departmentBreakdown: refinedBreakdown,
      };
    } catch (error) {
      console.warn(`[CostEstimator] AI refinement failed, using base allocation:`, error);
      return estimate;
    }
  }

  return estimate;
}

/**
 * Apply learning feedback from historical data
 */
export function applyLearningFeedback(
  estimate: { oneTimeCostLow: number; oneTimeCostHigh: number; confidence: number },
  history: Array<{ estimated: number; actual: number; variance: number }>
): { oneTimeCostLow: number; oneTimeCostHigh: number; confidence: number } {
  if (history.length === 0) {
    return estimate;
  }

  // Calculate average variance
  const avgVariance =
    history.reduce((sum, h) => sum + h.variance, 0) / history.length;

  // Adjust estimates
  const adjustedLow = estimate.oneTimeCostLow * (1 + avgVariance);
  const adjustedHigh = estimate.oneTimeCostHigh * (1 + avgVariance);

  // Narrow confidence band with more data (min 10% spread)
  const narrowingFactor = Math.max(0.5, 1 - history.length / 100); // More data = narrower
  const spread = adjustedHigh - adjustedLow;
  const newSpread = Math.max(spread * narrowingFactor, adjustedLow * 0.1);

  const finalLow = adjustedLow;
  const finalHigh = adjustedLow + newSpread;

  // Increase confidence with more consistent data
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

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  driverCacheSize: number;
  estimateCacheSize: number;
} {
  return {
    driverCacheSize: costDriverCache.size,
    estimateCacheSize: estimateCache.size,
  };
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
 * Calculate sensitivity to different cost drivers
 */
export function calculateSensitivityAnalysis(
  estimate: CostEstimate,
  profile: CompanyProfile,
  drivers: CostDriver[]
): SensitivityAnalysis {
  const baseOneTime = estimate.oneTimeCostLow;
  const baseRecurring = estimate.recurringCostAnnual;

  // Analyze size sensitivity
  const sizeScenarios = [
    profile.employeeCount * 0.5,
    profile.employeeCount,
    profile.employeeCount * 2,
  ];
  const sizeImpact = sizeScenarios.map((size) => {
    const sizeMult = Math.pow(size / 100, 0.7);
    const baseSizeMult = Math.pow(profile.employeeCount / 100, 0.7);
    const multiplier = sizeMult / baseSizeMult;
    return {
      low: Math.round(baseOneTime * multiplier),
      high: Math.round(estimate.oneTimeCostHigh * multiplier),
      percentChange: Math.round((multiplier - 1) * 100),
    };
  });

  // Analyze geographic sensitivity
  const geoScenarios = [1, profile.geographicComplexity, profile.geographicComplexity * 2];
  const geoImpact = geoScenarios.map((geoComplexity) => {
    const geoMult = 1 + (geoComplexity - 1) * 0.05;
    const baseGeoMult = 1 + (profile.geographicComplexity - 1) * 0.05;
    const multiplier = geoMult / baseGeoMult;
    return {
      low: Math.round(baseOneTime * multiplier),
      high: Math.round(estimate.oneTimeCostHigh * multiplier),
      percentChange: Math.round((multiplier - 1) * 100),
    };
  });

  // Analyze driver confidence impact
  const confidenceVariation = drivers.map((driver) => {
    // If confidence were 20% lower
    const lowerConfidence = Math.max(0.3, driver.confidence - 0.2);
    // If confidence were 20% higher
    const higherConfidence = Math.min(1.0, driver.confidence + 0.2);
    
    const confidenceSpreadLow = 0.2 * (1 - lowerConfidence * 0.3);
    const confidenceSpreadHigh = 0.2 * (1 - higherConfidence * 0.3);
    
    return {
      low: Math.round(baseOneTime * (1 - confidenceSpreadHigh)),
      high: Math.round(estimate.oneTimeCostHigh * (1 + confidenceSpreadLow)),
      percentChange: Math.round(((1 + confidenceSpreadLow) - 1) * 100),
    };
  });

  return {
    baselineOneTime: baseOneTime,
    baselineRecurring: baseRecurring,
    factors: [
      {
        factor: 'sizeMultiplier',
        currentValue: Math.pow(profile.employeeCount / 100, 0.7),
        impactOnOneTime: sizeImpact,
        impactOnRecurring: sizeImpact.map((s) => ({
          low: Math.round(baseRecurring * (s.low / baseOneTime)),
          high: Math.round(baseRecurring * (s.high / baseOneTime)),
          percentChange: s.percentChange,
        })),
        recommendation:
          profile.employeeCount > 500
            ? 'Consider economies of scale at this size'
            : undefined,
      },
      {
        factor: 'geoMultiplier',
        currentValue: 1 + (profile.geographicComplexity - 1) * 0.05,
        impactOnOneTime: geoImpact,
        impactOnRecurring: geoImpact.map((g) => ({
          low: Math.round(baseRecurring * (g.low / baseOneTime)),
          high: Math.round(baseRecurring * (g.high / baseOneTime)),
          percentChange: g.percentChange,
        })),
        recommendation:
          profile.geographicComplexity > 10
            ? 'Multi-state complexity is driving costs'
            : undefined,
      },
      {
        factor: 'techMaturity',
        currentValue: TECH_MATURITY_MULTIPLIERS[profile.techMaturity],
        impactOnOneTime: confidenceVariation.slice(0, 3),
        impactOnRecurring: confidenceVariation.slice(0, 3),
        recommendation:
          profile.techMaturity === TechMaturity.LOW
            ? 'Investing in tech infrastructure could reduce long-term costs'
            : undefined,
      },
    ],
  };
}

/**
 * Phase 1: Portfolio Trend Analysis
 * Analyzes trends across multiple cost estimates
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
 * Aggregate cost estimates into portfolio trends
 */
export function aggregatePortfolioTrends(estimates: CostEstimate[]): PortfolioTrend {
  if (estimates.length === 0) {
    return {
      totalOneTimeLow: 0,
      totalOneTimeHigh: 0,
      totalRecurringAnnual: 0,
      estimateCount: 0,
      averageConfidence: 0,
      threeYearExposureLow: 0,
      threeYearExposureHigh: 0,
      costsByDepartment: {},
      costsByRisk: { MINIMAL: 0, LOW: 0, MEDIUM: 0, HIGH: 0 },
      topDrivers: [],
    };
  }

  // Aggregate costs
  const totalOneTimeLow = estimates.reduce((sum, e) => sum + e.oneTimeCostLow, 0);
  const totalOneTimeHigh = estimates.reduce((sum, e) => sum + e.oneTimeCostHigh, 0);
  const totalRecurringAnnual = estimates.reduce(
    (sum, e) => sum + e.recurringCostAnnual,
    0
  );
  const averageConfidence =
    estimates.reduce((sum, e) => sum + e.confidence, 0) / estimates.length;

  // Department breakdown
  const costsByDepartment: Record<string, { oneTime: number; recurring: number }> = {};
  estimates.forEach((estimate) => {
    estimate.departmentBreakdown.forEach((dept) => {
      if (!costsByDepartment[dept.department]) {
        costsByDepartment[dept.department] = { oneTime: 0, recurring: 0 };
      }
      costsByDepartment[dept.department].oneTime += dept.oneTimeCost;
      costsByDepartment[dept.department].recurring += dept.recurringCostAnnual;
    });
  });

  // Risk distribution (placeholder - assume standard scenarios)
  const costsByRisk = { MINIMAL: 0, LOW: 0, MEDIUM: 0, HIGH: 0 };
  estimates.forEach((estimate) => {
    costsByRisk.LOW += estimate.oneTimeCostLow + estimate.recurringCostAnnual * 3;
  });

  // Top cost drivers
  const allDrivers: Array<CostDriver & { estimateCost: number }> = [];
  estimates.forEach((estimate) => {
    estimate.costDrivers.forEach((driver) => {
      allDrivers.push({ ...driver, estimateCost: driver.estimatedCost });
    });
  });

  const topDrivers = allDrivers
    .sort((a, b) => b.estimatedCost - a.estimatedCost)
    .slice(0, 10)
    .map((driver) => ({
      description: driver.description,
      category: driver.category,
      totalCost: driver.estimatedCost,
      confidence: driver.confidence,
    }));

  return {
    totalOneTimeLow,
    totalOneTimeHigh,
    totalRecurringAnnual,
    estimateCount: estimates.length,
    averageConfidence,
    threeYearExposureLow: totalOneTimeLow + totalRecurringAnnual * 3,
    threeYearExposureHigh: totalOneTimeHigh + totalRecurringAnnual * 3,
    costsByDepartment,
    costsByRisk,
    topDrivers,
  };
}

/**
 * Forecast portfolio trends based on historical data
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

export function forecastPortfolioTrends(
  trends: PortfolioTrend,
  years: number = 3
): PortfolioForecast {
  const projections = [];

  // Assume 2% annual inflation in recurring costs
  const inflationRate = 0.02;

  for (let year = 1; year <= years; year++) {
    const inflationMultiplier = Math.pow(1 + inflationRate, year - 1);
    const projectedRecurring = Math.round(
      trends.totalRecurringAnnual * inflationMultiplier
    );
    const projectedOneTimeLow = year === 1 ? trends.totalOneTimeLow : 0;
    const projectedOneTimeHigh = year === 1 ? trends.totalOneTimeHigh : 0;

    let cumulative: number = 0;
    if (projections.length > 0) {
      cumulative = projections.reduce(
        (sum, p) => sum + p.oneTimeLow + p.recurringAnnual,
        0
      );
    }
    cumulative += projectedOneTimeLow + projectedRecurring;

    projections.push({
      year,
      oneTimeLow: projectedOneTimeLow,
      oneTimeHigh: projectedOneTimeHigh,
      recurringAnnual: projectedRecurring,
      cumulative,
    });
  }

  // Identify risk factors
  const riskFactors: string[] = [];
  if (trends.estimateCount < 5) {
    riskFactors.push('Limited estimate dataset - forecast may be inaccurate');
  }
  if (trends.averageConfidence < 0.7) {
    riskFactors.push('Low average confidence scores - verify key assumptions');
  }
  if (trends.costsByDepartment['IT']?.oneTime > trends.totalOneTimeLow * 0.6) {
    riskFactors.push('IT implementation costs are high - consider phased approach');
  }

  return {
    currentYear: {
      oneTimeLow: trends.totalOneTimeLow,
      oneTimeHigh: trends.totalOneTimeHigh,
      recurringAnnual: trends.totalRecurringAnnual,
    },
    projections,
    riskFactors,
  };
}
