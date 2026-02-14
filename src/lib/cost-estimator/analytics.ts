import type {
  CompanyProfile,
  CostDriver,
  CostEstimate,
  PortfolioForecast,
  PortfolioTrend,
  SensitivityAnalysis,
} from '../../types/cost-estimate';
import { TechMaturity } from '../../types/cost-estimate';

const TECH_MATURITY_MULTIPLIERS: Record<TechMaturity, number> = {
  [TechMaturity.LOW]: 1.2,
  [TechMaturity.MEDIUM]: 1.0,
  [TechMaturity.HIGH]: 0.85,
};

export function calculateSensitivityAnalysis(
  estimate: CostEstimate,
  profile: CompanyProfile,
  drivers: CostDriver[]
): SensitivityAnalysis {
  const baseOneTime = estimate.oneTimeCostLow;
  const baseRecurring = estimate.recurringCostAnnual;

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

  const geoScenarios = [
    1,
    profile.geographicComplexity,
    profile.geographicComplexity * 2,
  ];
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

  const confidenceVariation = drivers.map((driver) => {
    const lowerConfidence = Math.max(0.3, driver.confidence - 0.2);
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

export function aggregatePortfolioTrends(
  estimates: CostEstimate[]
): PortfolioTrend {
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

  const totalOneTimeLow = estimates.reduce((sum, e) => sum + e.oneTimeCostLow, 0);
  const totalOneTimeHigh = estimates.reduce(
    (sum, e) => sum + e.oneTimeCostHigh,
    0
  );
  const totalRecurringAnnual = estimates.reduce(
    (sum, e) => sum + e.recurringCostAnnual,
    0
  );
  const averageConfidence =
    estimates.reduce((sum, e) => sum + e.confidence, 0) / estimates.length;

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

  const costsByRisk = { MINIMAL: 0, LOW: 0, MEDIUM: 0, HIGH: 0 };
  estimates.forEach((estimate) => {
    costsByRisk.LOW += estimate.oneTimeCostLow + estimate.recurringCostAnnual * 3;
  });

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

export function forecastPortfolioTrends(
  trends: PortfolioTrend,
  years: number = 3
): PortfolioForecast {
  const projections = [];
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
