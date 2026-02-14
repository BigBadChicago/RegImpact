/**
 * Unit tests for Cost Estimator
 * Tests AI-powered cost estimation with company-specific calibration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  extractCostDrivers,
  estimateWithAI,
  calculateImplementationCost,
  allocateToDepartments,
  generateScenarios,
  applyLearningFeedback,
  allocateToDepartmentsWithAI,
  calculateSensitivityAnalysis,
  aggregatePortfolioTrends,
  forecastPortfolioTrends,
} from '@/lib/cost-estimator';
import {
  mockCompanyProfiles,
  mockPrivacyCostDrivers,
} from '../../fixtures/cost-estimates';
import {
  TechMaturity,
  Department,
  CostCategory,
  RiskLevel,
} from '@/types/cost-estimate';

// Mock OpenAI
vi.mock('openai');

describe('Cost Estimator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('extractCostDrivers', () => {
    it('should extract cost drivers from privacy regulation text', async () => {
      const regulationText = `
        Companies must implement data subject access request (DSAR) portal.
        Annual compliance audits are required.
        Privacy officer must be designated within 30 days.
      `;
      const title = 'California Privacy Rights Act';

      const drivers = await extractCostDrivers(regulationText, title);

      expect(drivers).toBeDefined();
      expect(Array.isArray(drivers)).toBe(true);
      expect(drivers.length).toBeGreaterThan(0);

      // Should identify system requirements
      const systemDriver = drivers.find((d: any) =>
        d.description.toLowerCase().includes('portal')
      );
      expect(systemDriver).toBeDefined();
      expect(systemDriver?.category).toBe(CostCategory.SYSTEM_CHANGES);
      expect(systemDriver?.isOneTime).toBe(true);

      // Should identify personnel requirements
      const personnelDriver = drivers.find((d: any) =>
        d.description.toLowerCase().includes('officer')
      );
      expect(personnelDriver).toBeDefined();
      expect(personnelDriver?.category).toBe(CostCategory.PERSONNEL);
      expect(personnelDriver?.isOneTime).toBe(false);

      // Should identify audit requirements
      const auditDriver = drivers.find((d: any) =>
        d.description.toLowerCase().includes('audit')
      );
      expect(auditDriver).toBeDefined();
      expect(auditDriver?.category).toBe(CostCategory.AUDIT);
      expect(auditDriver?.isOneTime).toBe(false);
    });

    it('should assign confidence scores to cost drivers', async () => {
      const regulationText = 'Companies must provide annual training.';
      const drivers = await extractCostDrivers(regulationText, 'Test Regulation');

      drivers.forEach((driver: any) => {
        expect(driver.confidence).toBeGreaterThanOrEqual(0);
        expect(driver.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should distinguish between one-time and recurring costs', async () => {
      const regulationText = `
        Initial system setup required ($10K).
        Annual reporting fee of $5K must be paid each year.
      `;
      const drivers = await extractCostDrivers(regulationText, 'Test Regulation');

      const oneTimeCosts = drivers.filter((d: any) => d.isOneTime);
      const recurringCosts = drivers.filter((d: any) => !d.isOneTime);

      expect(oneTimeCosts.length).toBeGreaterThan(0);
      expect(recurringCosts.length).toBeGreaterThan(0);
    });

    it('should cache results for identical inputs', async () => {
      const text = 'Companies must conduct annual audits.';
      const title = 'Test Regulation';

      const result1 = await extractCostDrivers(text, title);
      const result2 = await extractCostDrivers(text, title);

      // Second call should return cached result
      expect(result1).toEqual(result2);
    });

    it('should handle API failures gracefully', async () => {
      const text = 'Invalid regulation text';
      const title = 'Test';

      // Should not throw error
      const drivers = await extractCostDrivers(text, title);

      // Should return reasonable fallback
      expect(drivers).toBeDefined();
      expect(Array.isArray(drivers)).toBe(true);
    });
  });

  describe('estimateWithAI', () => {
    it('should generate complete estimate with AI', async () => {
      const regulationText = 'Privacy regulation requiring data mapping and DSAR portal.';
      const title = 'CPRA';
      const profile = mockCompanyProfiles.techStartup;

      const estimate = await estimateWithAI(regulationText, title, profile);

      expect(estimate).toBeDefined();
      expect(estimate.oneTimeCostLow).toBeGreaterThan(0);
      expect(estimate.oneTimeCostHigh).toBeGreaterThan(estimate.oneTimeCostLow);
      expect(estimate.recurringCostAnnual).toBeGreaterThanOrEqual(0);
      expect(estimate.confidence).toBeGreaterThan(0);
      expect(estimate.confidence).toBeLessThanOrEqual(1);
    });

    it('should include cost drivers in estimate', async () => {
      const estimate = await estimateWithAI(
        'Test regulation',
        'Test',
        mockCompanyProfiles.techStartup
      );

      expect(estimate.costDrivers).toBeDefined();
      expect(Array.isArray(estimate.costDrivers)).toBe(true);
    });
  });

  describe('calculateImplementationCost', () => {
    it('should apply industry multiplier for healthcare', () => {
      const drivers = mockPrivacyCostDrivers;
      const profile = mockCompanyProfiles.healthcareMidsize;

      const cost = calculateImplementationCost(drivers, profile);

      // Healthcare has 1.4x multiplier due to HIPAA complexity
      expect(cost.oneTimeCostLow).toBeGreaterThan(88000 * 1.3); // Base cost * multiplier
    });

    it('should apply size multiplier with non-linear scaling', () => {
      const drivers = mockPrivacyCostDrivers;
      const smallProfile = mockCompanyProfiles.techStartup; // 50 employees
      // Use same industry/geo as smallProfile to isolate size effect
      const largeProfile = {
        ...mockCompanyProfiles.techStartup,
        employeeCount: 1000,
        revenue: 500_000_000,
      }; // 1000 employees (20x)

      const smallCost = calculateImplementationCost(drivers, smallProfile);
      const largeCost = calculateImplementationCost(drivers, largeProfile);

      // Cost should increase with size, but not linearly (economies of scale)
      expect(largeCost.oneTimeCostLow).toBeGreaterThan(smallCost.oneTimeCostLow);
      const ratio = largeCost.oneTimeCostLow / smallCost.oneTimeCostLow;
      // With 0.7 exponent: (1000/100)^0.7 / (50/100)^0.7 = 10^0.7 / 0.5^0.7 = 5.01 / 0.62 = ~8.1x
      expect(ratio).toBeLessThan(20); // Should not be 20x for 20x employees
      expect(ratio).toBeGreaterThan(5); // But should be more than sqrt(20) = 4.5x
    });

    it('should apply geographic complexity multiplier', () => {
      const drivers = mockPrivacyCostDrivers;
      const lowGeo = { ...mockCompanyProfiles.techStartup, geographicComplexity: 1 };
      const highGeo = {
        ...mockCompanyProfiles.techStartup,
        geographicComplexity: 50,
      };

      const lowCost = calculateImplementationCost(drivers, lowGeo);
      const highCost = calculateImplementationCost(drivers, highGeo);

      // ~5% per additional state
      expect(highCost.oneTimeCostLow).toBeGreaterThan(lowCost.oneTimeCostLow);
    });

    it('should apply tech maturity discount', () => {
      const drivers = mockPrivacyCostDrivers;
      const lowTech = { ...mockCompanyProfiles.techStartup, techMaturity: TechMaturity.LOW };
      const highTech = {
        ...mockCompanyProfiles.techStartup,
        techMaturity: TechMaturity.HIGH,
      };

      const lowCost = calculateImplementationCost(drivers, lowTech);
      const highCost = calculateImplementationCost(drivers, highTech);

      // High tech maturity should reduce cost (better systems in place)
      expect(highCost.oneTimeCostLow).toBeLessThan(lowCost.oneTimeCostLow);
    });

    it('should separate one-time vs recurring costs', () => {
      const drivers = mockPrivacyCostDrivers;
      const profile = mockCompanyProfiles.techStartup;

      const cost = calculateImplementationCost(drivers, profile);

      expect(cost.oneTimeCostLow).toBeGreaterThan(0);
      expect(cost.recurringCostAnnual).toBeGreaterThan(0);
    });

    it('should provide confidence ranges', () => {
      const drivers = mockPrivacyCostDrivers;
      const profile = mockCompanyProfiles.techStartup;

      const cost = calculateImplementationCost(drivers, profile);

      expect(cost.oneTimeCostHigh).toBeGreaterThan(cost.oneTimeCostLow);
      const spread = cost.oneTimeCostHigh / cost.oneTimeCostLow;
      expect(spread).toBeLessThan(2.5); // Confidence band <2.5x
    });

    it('should include department breakdown', () => {
      const drivers = mockPrivacyCostDrivers;
      const profile = mockCompanyProfiles.techStartup;

      const cost = calculateImplementationCost(drivers, profile);

      expect(cost.departmentBreakdown).toBeDefined();
      expect(Array.isArray(cost.departmentBreakdown)).toBe(true);
      expect(cost.departmentBreakdown.length).toBeGreaterThan(0);
    });
  });

  describe('allocateToDepartments', () => {
    it('should map cost categories to departments', () => {
      const drivers = mockPrivacyCostDrivers;
      const profile = mockCompanyProfiles.techStartup;

      const breakdown = allocateToDepartments(drivers, profile);

      // Legal department should have legal review costs
      const legal = breakdown.find((d: any) => d.department === Department.LEGAL);
      expect(legal).toBeDefined();
      expect(legal!.lineItems.length).toBeGreaterThan(0);

      // IT department should have system change costs
      const it = breakdown.find((d: any) => d.department === Department.IT);
      expect(it).toBeDefined();
      expect(it!.lineItems.length).toBeGreaterThan(0);
    });

    it('should calculate FTE impact per department', () => {
      const drivers = mockPrivacyCostDrivers;
      const profile = mockCompanyProfiles.techStartup;

      const breakdown = allocateToDepartments(drivers, profile);

      breakdown.forEach((dept) => {
        expect(dept.fteImpact).toBeGreaterThanOrEqual(0);
        expect(dept.fteImpact).toBeLessThan(3); // Reasonable FTE range
      });
    });

    it('should generate budget codes', () => {
      const drivers = mockPrivacyCostDrivers;
      const profile = mockCompanyProfiles.techStartup;

      const breakdown = allocateToDepartments(drivers, profile);

      breakdown.forEach((dept) => {
        expect(dept.budgetCode).toBeDefined();
        expect(dept.budgetCode).toMatch(/^[A-Z]+-[A-Z]+-\d+$/); // Format: DEPT-TYPE-NUM
      });
    });

    it('should ensure department totals sum to overall cost', () => {
      const drivers = mockPrivacyCostDrivers;
      const profile = mockCompanyProfiles.techStartup;

      const cost = calculateImplementationCost(drivers, profile);
      const breakdown = cost.departmentBreakdown; // Use breakdown from cost estimate

      const deptOneTimeTotal = breakdown.reduce((sum: number, d: any) => sum + d.oneTimeCost, 0);
      const deptRecurringTotal = breakdown.reduce(
        (sum: number, d: any) => sum + d.recurringCostAnnual,
        0
      );

      // Calculate mid-point for comparison (department totals don't have confidence band)
      const oneTimeCostMid = (cost.oneTimeCostLow + cost.oneTimeCostHigh) / 2;

      // Allow 1% tolerance for rounding
      expect(Math.abs(deptOneTimeTotal - oneTimeCostMid) / oneTimeCostMid).toBeLessThan(0.01);
      expect(
        Math.abs(deptRecurringTotal - cost.recurringCostAnnual) /
          cost.recurringCostAnnual
      ).toBeLessThan(0.01);
    });
  });

  describe('generateScenarios', () => {
    it('should generate 4 standard scenarios', () => {
      const baseCost = {
        oneTimeCost: 88000,
        recurringCostAnnual: 85000,
      };
      const profile = mockCompanyProfiles.techStartup;

      const scenarios = generateScenarios(baseCost, profile);

      expect(scenarios.minimal).toBeDefined();
      expect(scenarios.standard).toBeDefined();
      expect(scenarios.bestInClass).toBeDefined();
      expect(scenarios.delay90Days).toBeDefined();
    });

    it('should order scenarios by cost: minimal < standard < best-in-class', () => {
      const baseCost = {
        oneTimeCost: 88000,
        recurringCostAnnual: 85000,
      };
      const profile = mockCompanyProfiles.techStartup;

      const scenarios = generateScenarios(baseCost, profile);

      expect(scenarios.minimal.threeYearTotal).toBeLessThan(
        scenarios.standard.threeYearTotal
      );
      expect(scenarios.standard.threeYearTotal).toBeLessThan(
        scenarios.bestInClass.threeYearTotal
      );
    });

    it('should set risk levels inversely to cost', () => {
      const baseCost = {
        oneTimeCost: 88000,
        recurringCostAnnual: 85000,
      };
      const profile = mockCompanyProfiles.techStartup;

      const scenarios = generateScenarios(baseCost, profile);

      // Minimal cost = higher risk
      expect(scenarios.minimal.riskLevel).toBe(RiskLevel.MEDIUM);
      // Standard = low risk
      expect(scenarios.standard.riskLevel).toBe(RiskLevel.LOW);
      // Best in class = minimal risk
      expect(scenarios.bestInClass.riskLevel).toBe(RiskLevel.MINIMAL);
      // Delay = high risk
      expect(scenarios.delay90Days.riskLevel).toBe(RiskLevel.HIGH);
    });

    it('should include penalties in delay scenario', () => {
      const baseCost = {
        oneTimeCost: 88000,
        recurringCostAnnual: 85000,
      };
      const profile = mockCompanyProfiles.techStartup;

      const scenarios = generateScenarios(baseCost, profile);

      // Delay scenario should cost more than standard due to penalties
      expect(scenarios.delay90Days.oneTimeCost).toBeGreaterThan(
        scenarios.standard.oneTimeCost
      );
    });

    it('should recommend optimal scenario based on risk profile', () => {
      const baseCost = {
        oneTimeCost: 88000,
        recurringCostAnnual: 85000,
      };
      const lowRiskProfile = {
        ...mockCompanyProfiles.financeEnterprise,
        riskAppetite: RiskLevel.LOW,
      };
      const highRiskProfile = {
        ...mockCompanyProfiles.retailSmall,
        riskAppetite: RiskLevel.HIGH,
      };

      const lowRiskScenarios = generateScenarios(baseCost, lowRiskProfile);
      const highRiskScenarios = generateScenarios(baseCost, highRiskProfile);

      // Low risk appetite should recommend standard or best-in-class
      expect(['standard', 'bestInClass']).toContain(lowRiskScenarios.recommended);
      // High risk appetite might recommend minimal
      expect(['minimal', 'standard']).toContain(highRiskScenarios.recommended);
    });
  });

  describe('applyLearningFeedback', () => {
    it('should adjust estimates based on historical variance', () => {
      const estimate = {
        oneTimeCostLow: 80000,
        oneTimeCostHigh: 100000,
        confidence: 0.75,
      };
      const history = [
        { estimated: 90000, actual: 105000, variance: 0.167 }, // +16.7%
        { estimated: 85000, actual: 98000, variance: 0.153 }, // +15.3%
        { estimated: 95000, actual: 110000, variance: 0.158 }, // +15.8%
      ];

      const adjusted = applyLearningFeedback(estimate, history);

      // Should adjust upward based on consistent over-runs
      expect(adjusted.oneTimeCostLow).toBeGreaterThan(estimate.oneTimeCostLow);
      expect(adjusted.oneTimeCostHigh).toBeGreaterThan(estimate.oneTimeCostHigh);
    });

    it('should narrow confidence bands with more data', () => {
      const estimate = {
        oneTimeCostLow: 80000,
        oneTimeCostHigh: 120000, // 50% spread
        confidence: 0.75,
      };
      const extensiveHistory = Array(20)
        .fill(null)
        .map(() => ({
          estimated: 90000,
          actual: 92000,
          variance: 0.022, // Consistent 2.2%
        }));

      const adjusted = applyLearningFeedback(estimate, extensiveHistory);

      const originalSpread = estimate.oneTimeCostHigh / estimate.oneTimeCostLow;
      const adjustedSpread = adjusted.oneTimeCostHigh / adjusted.oneTimeCostLow;

      // Confidence band should narrow with consistent data
      expect(adjustedSpread).toBeLessThan(originalSpread);
      expect(adjusted.confidence).toBeGreaterThan(estimate.confidence);
    });

    it('should handle empty history gracefully', () => {
      const estimate = {
        oneTimeCostLow: 80000,
        oneTimeCostHigh: 100000,
        confidence: 0.75,
      };

      const adjusted = applyLearningFeedback(estimate, []);

      // No history = no adjustment
      expect(adjusted).toEqual(estimate);
    });
  });

  describe('allocateToDepartmentsWithAI', () => {
    it('should handle graceful fallback when AI is unavailable', async () => {
      const drivers = [
        {
          category: CostCategory.SYSTEM_CHANGES,
          description: 'Implement DSAR portal',
          isOneTime: true,
          estimatedCost: 50000,
          confidence: 0.8,
          evidence: [
            {
              type: 'INDUSTRY_BENCHMARK' as const,
              source: 'Privacy Impact Group',
              confidence: 0.85,
              costEstimate: 50000,
            },
          ],
        },
      ];
      const profile = mockCompanyProfiles.techStartup;

      // Should not throw error and should return a breakdown
      const allocation = await allocateToDepartmentsWithAI(
        drivers,
        profile,
        'Privacy Regulation'
      );

      expect(allocation).toBeDefined();
      expect(Array.isArray(allocation)).toBe(true);
      // Should have at least base allocation departments
      expect(allocation.length).toBeGreaterThan(0);
    });

    it('should return array of department allocations', async () => {
      const drivers = mockPrivacyCostDrivers;
      const profile = mockCompanyProfiles.techStartup;

      const allocation = await allocateToDepartmentsWithAI(
        drivers,
        profile,
        'Test Regulation'
      );

      expect(Array.isArray(allocation)).toBe(true);
      allocation.forEach((dept) => {
        expect(dept.department).toBeDefined();
        expect(dept.oneTimeCost).toBeGreaterThanOrEqual(0);
        expect(dept.recurringCostAnnual).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('calculateSensitivityAnalysis', () => {
    it('should return sensitivity analysis object', () => {
      const estimate = {
        oneTimeCostLow: 80000,
        oneTimeCostHigh: 100000,
        recurringCostAnnual: 50000,
      };
      const profile = mockCompanyProfiles.techStartup;
      const drivers = mockPrivacyCostDrivers;

      const sensitivity = calculateSensitivityAnalysis(estimate, profile, drivers);

      expect(sensitivity).toBeDefined();
      expect(sensitivity.sizeVariations).toBeDefined();
      expect(sensitivity.geographicVariations).toBeDefined();
      expect(sensitivity.techMaturityVariations).toBeDefined();
      expect(sensitivity.recommendations).toBeDefined();
      expect(Array.isArray(sensitivity.recommendations)).toBe(true);
    });

    it('should include variation scenarios', () => {
      const estimate = {
        oneTimeCostLow: 80000,
        oneTimeCostHigh: 100000,
        recurringCostAnnual: 50000,
      };
      const profile = mockCompanyProfiles.techStartup;
      const drivers = mockPrivacyCostDrivers;

      const sensitivity = calculateSensitivityAnalysis(estimate, profile, drivers);

      // Should have 3 size variations (reduced, baseline, increased)
      expect(sensitivity.sizeVariations.length).toBe(3);
      // Should have 3 geographic variations
      expect(sensitivity.geographicVariations.length).toBe(3);
      // Should have 3 tech maturity levels
      expect(sensitivity.techMaturityVariations.length).toBe(3);

      // Each variation should have cost data
      sensitivity.sizeVariations.forEach((v) => {
        expect(v.oneTimeCost).toBeGreaterThanOrEqual(0);
        expect(v.recurringCost).toBeGreaterThanOrEqual(0);
      });
    });

    it('should show impact of cost parameter changes', () => {
      const estimate = {
        oneTimeCostLow: 80000,
        oneTimeCostHigh: 100000,
        recurringCostAnnual: 50000,
      };
      const profile = mockCompanyProfiles.techStartup;
      const drivers = mockPrivacyCostDrivers;

      const sensitivity = calculateSensitivityAnalysis(estimate, profile, drivers);

      // Higher tech maturity should reduce costs
      const lowTech = sensitivity.techMaturityVariations[0].oneTimeCost;
      const highTech = sensitivity.techMaturityVariations[2].oneTimeCost;
      expect(highTech).toBeLessThanOrEqual(lowTech);
    });
  });

  describe('aggregatePortfolioTrends', () => {
    it('should aggregate multiple cost estimates', () => {
      const estimates: CostEstimate[] = [
        {
          regulationId: '1',
          regulationTitle: 'CPRA',
          customerId: 'cust1',
          oneTimeCostLow: 80000,
          oneTimeCostHigh: 100000,
          oneTimeCostMid: 90000,
          recurringCostAnnual: 50000,
          recurringCostLow: 42500,
          recurringCostHigh: 57500,
          departmentBreakdown: {
            IT: { oneTime: 60000, recurring: 20000 },
            LEGAL: { oneTime: 30000, recurring: 30000 },
          },
          confidenceLow: 0.7,
          confidenceHigh: 0.85,
          drivers: [],
          scenarios: [],
        },
        {
          regulationId: '2',
          regulationTitle: 'GDPR',
          customerId: 'cust1',
          oneTimeCostLow: 120000,
          oneTimeCostHigh: 150000,
          oneTimeCostMid: 135000,
          recurringCostAnnual: 80000,
          recurringCostLow: 68000,
          recurringCostHigh: 92000,
          departmentBreakdown: {
            IT: { oneTime: 80000, recurring: 40000 },
            LEGAL: { oneTime: 40000, recurring: 40000 },
          },
          confidenceLow: 0.75,
          confidenceHigh: 0.9,
          drivers: [],
          scenarios: [],
        },
      ];

      const trends = aggregatePortfolioTrends(estimates);

      expect(trends).toBeDefined();
      expect(trends.totalOneTime).toBeGreaterThan(0);
      expect(trends.totalRecurring).toBeGreaterThan(0);
      expect(trends.estimateCount).toBe(2);
      expect(trends.costsByDepartment).toBeDefined();
      expect(trends.topDrivers).toBeDefined();
      expect(trends.riskByLevel).toBeDefined();
    });

    it('should calculate costs by department correctly', () => {
      const estimates: CostEstimate[] = [
        {
          regulationId: '1',
          regulationTitle: 'CPRA',
          customerId: 'cust1',
          oneTimeCostLow: 80000,
          oneTimeCostHigh: 100000,
          oneTimeCostMid: 90000,
          recurringCostAnnual: 50000,
          recurringCostLow: 42500,
          recurringCostHigh: 57500,
          departmentBreakdown: {
            IT: { oneTime: 60000, recurring: 20000 },
            LEGAL: { oneTime: 30000, recurring: 30000 },
          },
          confidenceLow: 0.7,
          confidenceHigh: 0.85,
          drivers: [],
          scenarios: [],
        },
      ];

      const trends = aggregatePortfolioTrends(estimates);

      expect(trends.costsByDepartment.IT).toBeDefined();
      expect(trends.costsByDepartment.IT.oneTime).toBe(60000);
      expect(trends.costsByDepartment.LEGAL.recurring).toBe(30000);
    });

    it('should assess overall risk profile', () => {
      const estimates: CostEstimate[] = [
        {
          regulationId: '1',
          regulationTitle: 'CPRA',
          customerId: 'cust1',
          oneTimeCostLow: 80000,
          oneTimeCostHigh: 100000,
          oneTimeCostMid: 90000,
          recurringCostAnnual: 50000,
          recurringCostLow: 42500,
          recurringCostHigh: 57500,
          departmentBreakdown: {},
          confidenceLow: 0.7,
          confidenceHigh: 0.85,
          drivers: [],
          scenarios: [],
        },
      ];

      const trends = aggregatePortfolioTrends(estimates);

      expect(trends.riskByLevel).toBeDefined();
      expect(typeof trends.riskByLevel.high).toBe('number');
      expect(typeof trends.riskByLevel.medium).toBe('number');
      expect(typeof trends.riskByLevel.low).toBe('number');
    });
  });

  describe('forecastPortfolioTrends', () => {
    it('should generate 3-year forecast', () => {
      const trends = {
        totalOneTime: 200000,
        totalRecurring: 100000,
        estimateCount: 2,
        costsByDepartment: {},
        topDrivers: [],
        riskByLevel: { high: 0, medium: 5, low: 10 },
      };

      const forecast = forecastPortfolioTrends(trends, 3);

      expect(forecast).toBeDefined();
      expect(forecast.years).toBeDefined();
      expect(forecast.years.length).toBe(3);
      expect(forecast.inflationRate).toBe(0.02); // 2% inflation
    });

    it('should track year-by-year costs', () => {
      const trends = {
        totalOneTime: 200000,
        totalRecurring: 100000,
        estimateCount: 1,
        costsByDepartment: {},
        topDrivers: [],
        riskByLevel: { high: 0, medium: 5, low: 10 },
      };

      const forecast = forecastPortfolioTrends(trends, 3);

      // Year 1: 200000 one-time + 100000 recurring
      expect(forecast.years[0].year).toBe(1);
      expect(forecast.years[0].oneTime).toBeGreaterThanOrEqual(0);
      expect(forecast.years[0].recurring).toBeGreaterThanOrEqual(0);

      // Later years should have cumulative totals
      expect(forecast.years[2].cumulative).toBeGreaterThan(forecast.years[0].cumulative);
    });

    it('should include emerging risks and recommendations', () => {
      const trends = {
        totalOneTime: 200000,
        totalRecurring: 100000,
        estimateCount: 2,
        costsByDepartment: {},
        topDrivers: [],
        riskByLevel: { high: 2, medium: 8, low: 5 },
      };

      const forecast = forecastPortfolioTrends(trends, 3);

      expect(forecast.emergingRisks).toBeDefined();
      expect(Array.isArray(forecast.emergingRisks)).toBe(true);
      expect(forecast.recommendations).toBeDefined();
      expect(Array.isArray(forecast.recommendations)).toBe(true);
    });
  });
});
