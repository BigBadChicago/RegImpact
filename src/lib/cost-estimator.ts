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
const estimateCache = new Map<string, any>();

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
    return extractCostDriversDeterministic(regulationText, regulationTitle);
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
      (d: any, index: number) => ({
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
    return extractCostDriversDeterministic(regulationText, regulationTitle);
  }
}

/**
 * Deterministic cost driver extraction (fallback/default)
 */
function extractCostDriversDeterministic(
  regulationText: string,
  regulationTitle: string
): Promise<CostDriver[]> {
  const text = regulationText.toLowerCase();
  const drivers: CostDriver[] = [];
  let driverId = 1;

  // Pattern matching for common requirements
  if (text.includes('portal') || text.includes('system') || text.includes('dsar')) {
    drivers.push({
      id: `driver-det-${driverId++}`,
      category: CostCategory.SYSTEM_CHANGES,
      description: 'System changes and data request portal',
      isOneTime: true,
      estimatedCost: 30000,
      confidence: 0.7,
      department: Department.IT,
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

  // Allocate to departments
  const departmentBreakdown = allocateToDepartments(drivers, profile);

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
 * Allocate costs to departments
 */
export function allocateToDepartments(
  drivers: CostDriver[],
  profile: CompanyProfile
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

      const oneTimeCost = deptDrivers
        .filter((d) => d.isOneTime)
        .reduce((sum, d) => sum + d.estimatedCost, 0);

      const recurringCostAnnual = deptDrivers
        .filter((d) => !d.isOneTime)
        .reduce((sum, d) => sum + d.estimatedCost, 0);

      // Estimate FTE impact (rough heuristic: $100K = 1 FTE)
      const fteImpact = parseFloat(
        (recurringCostAnnual / 100000 + oneTimeCost / 200000).toFixed(2)
      );

      // Generate budget code
      const deptCode = dept.substring(0, 4).toUpperCase();
      const budgetCode = `${deptCode}-COMP-001`;

      return {
        department: dept,
        oneTimeCost: Math.round(oneTimeCost),
        recurringCostAnnual: Math.round(recurringCostAnnual),
        fteImpact,
        budgetCode,
        lineItems: deptDrivers,
      };
    })
    .filter((d): d is DepartmentCostBreakdown => d !== null);
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

  // Calculate with calibration
  const estimate = calculateImplementationCost(drivers, profile);

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
