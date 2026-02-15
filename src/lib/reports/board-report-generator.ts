/**
 * Board Report Generator
 * Generates executive-level compliance cost reports
 * Exports as JSON for printing/PDF conversion or structured data
 */

import type {
  CostEstimate,
  ScenarioAnalysis,
} from '@/types/cost-estimate';

export interface BoardReport {
  executiveSummary: {
    regulationTitle: string;
    jurisdiction: string;
    reportDate: Date;
    totalOneTimeCost: { low: number; high: number };
    totalRecurringCost: number;
    threeYearExposure: { low: number; high: number };
    confidence: number;
    methodology: string;
  };
  departmentImpact: {
    department: string;
    oneTimeCost: number;
    recurringCost: number;
    fteImpact: number;
    budgetCode: string;
  }[];
  scenarios: {
    key: 'minimal' | 'standard' | 'bestInClass' | 'delay90Days';
    name: string;
    description: string;
    threeYearTotal: number;
    riskLevel: string;
    recommendationReason?: string;
  }[];
  recommendedScenario: string;
  keyInsights: string[];
  implementationRoadmap: {
    phase: string;
    timeline: string;
    cost: number;
    department: string;
  }[];
  riskAnalysis: {
    riskFactors: string[];
    mitigationStrategies: string[];
  };
}

/**
 * Generate comprehensive board report
 */
export function generateBoardReport(
  estimate: CostEstimate,
  scenarios: ScenarioAnalysis,
  regulationTitle: string,
  jurisdiction: string
): BoardReport {
  // Executive Summary
  const executiveSummary = {
    regulationTitle,
    jurisdiction,
    reportDate: new Date(),
    totalOneTimeCost: {
      low: estimate.oneTimeCostLow,
      high: estimate.oneTimeCostHigh,
    },
    totalRecurringCost: estimate.recurringCostAnnual,
    threeYearExposure: {
      low: estimate.oneTimeCostLow + estimate.recurringCostAnnual * 3,
      high: estimate.oneTimeCostHigh + estimate.recurringCostAnnual * 3,
    },
    confidence: estimate.confidence,
    methodology: estimate.estimationMethod,
  };

  // Department Impact
  const departmentImpact = estimate.departmentBreakdown.map((dept) => ({
    department: dept.department,
    oneTimeCost: dept.oneTimeCost,
    recurringCost: dept.recurringCostAnnual,
    fteImpact: dept.fteImpact,
    budgetCode: dept.budgetCode || 'N/A',
  }));

  // Scenarios
  const scenarioList: Array<{ key: 'minimal' | 'standard' | 'bestInClass' | 'delay90Days'; name: string; description: string; threeYearTotal: number; riskLevel: string; recommendationReason?: string }> = [
    {
      key: 'minimal' as const,
      name: scenarios.minimal.name,
      description: scenarios.minimal.description,
      threeYearTotal: scenarios.minimal.threeYearTotal,
      riskLevel: scenarios.minimal.riskLevel,
      recommendationReason:
        scenarios.recommended === 'minimal'
          ? 'Cost-optimized approach with acceptable risk level'
          : undefined,
    },
    {
      key: 'standard' as const,
      name: scenarios.standard.name,
      description: scenarios.standard.description,
      threeYearTotal: scenarios.standard.threeYearTotal,
      riskLevel: scenarios.standard.riskLevel,
      recommendationReason:
        scenarios.recommended === 'standard'
          ? 'Balanced approach with optimal risk/cost ratio'
          : undefined,
    },
    {
      key: 'bestInClass' as const,
      name: scenarios.bestInClass.name,
      description: scenarios.bestInClass.description,
      threeYearTotal: scenarios.bestInClass.threeYearTotal,
      riskLevel: scenarios.bestInClass.riskLevel,
      recommendationReason:
        scenarios.recommended === 'bestInClass'
          ? 'Premium compliance with minimal risk exposure'
          : undefined,
    },
    {
      key: 'delay90Days' as const,
      name: scenarios.delay90Days.name,
      description: scenarios.delay90Days.description,
      threeYearTotal: scenarios.delay90Days.threeYearTotal,
      riskLevel: scenarios.delay90Days.riskLevel,
      recommendationReason:
        scenarios.recommended === 'delay90Days'
          ? 'Not recommended - Higher cost and risk due to delay'
          : 'Not recommended - Avoid delay penalties',
    },
  ];

  // Key Insights
  const keyInsights = generateKeyInsights(estimate, scenarios);

  // Implementation Roadmap
  const implementationRoadmap = generateImplementationRoadmap(estimate);

  // Risk Analysis
  const riskAnalysis = generateRiskAnalysis(estimate, scenarios);

  return {
    executiveSummary,
    departmentImpact,
    scenarios: scenarioList,
    recommendedScenario: scenarios.recommended,
    keyInsights,
    implementationRoadmap,
    riskAnalysis,
  };
}

/**
 * Generate key insights for board presentation
 */
function generateKeyInsights(
  estimate: CostEstimate,
  scenarios: ScenarioAnalysis
): string[] {
  const insights: string[] = [];

  // Total investment insight
  const avgOneTime =
    (estimate.oneTimeCostLow + estimate.oneTimeCostHigh) / 2;
  insights.push(
    `Total compliance investment: $${Math.round(avgOneTime).toLocaleString()} one-time + $${estimate.recurringCostAnnual.toLocaleString()}/year`
  );

  // Department concentration
  const sortedDepts = [...estimate.departmentBreakdown].sort(
    (a, b) =>
      b.oneTimeCost +
      b.recurringCostAnnual * 3 -
      (a.oneTimeCost + a.recurringCostAnnual * 3)
  );
  if (sortedDepts.length > 0) {
    const topDept = sortedDepts[0];
    insights.push(
      `Primary impact on ${topDept.department} department (${topDept.fteImpact} FTE)`
    );
  }

  // Cost savings comparison
  const standardCost = scenarios.standard.threeYearTotal;
  const minimalCost = scenarios.minimal.threeYearTotal;
  const savings = standardCost - minimalCost;
  if (savings > 0) {
    insights.push(
      `Potential 3-year savings: $${Math.round(savings).toLocaleString()} (minimal vs standard approach)`
    );
  }

  // Confidence level
  if (estimate.confidence >= 0.8) {
    insights.push(
      `High confidence estimate (${Math.round(estimate.confidence * 100)}%) based on ${estimate.estimationMethod}`
    );
  } else {
    insights.push(
      `Moderate confidence estimate (${Math.round(estimate.confidence * 100)}%) - recommend detailed assessment`
    );
  }

  // Delay cost
  const delayCost = scenarios.delay90Days.threeYearTotal - standardCost;
  if (delayCost > 0) {
    insights.push(
      `Delay penalty: +$${Math.round(delayCost).toLocaleString()} (rush fees + regulatory risks)`
    );
  }

  return insights;
}

/**
 * Generate implementation roadmap
 */
function generateImplementationRoadmap(
  estimate: CostEstimate
): BoardReport['implementationRoadmap'] {
  const roadmap: BoardReport['implementationRoadmap'] = [];

  // Phase 1: Planning & Assessment (Month 1)
  const planningCost = estimate.costDrivers
    .filter((d) => d.category === 'LEGAL_REVIEW' || d.category === 'CONSULTING')
    .reduce((sum, d) => sum + d.estimatedCost, 0);

  if (planningCost > 0) {
    roadmap.push({
      phase: 'Planning & Assessment',
      timeline: 'Month 1',
      cost: planningCost,
      department: 'LEGAL',
    });
  }

  // Phase 2: System Implementation (Months 2-3)
  const systemCost = estimate.costDrivers
    .filter((d) => d.category === 'SYSTEM_CHANGES' || d.category === 'INFRASTRUCTURE')
    .reduce((sum, d) => sum + d.estimatedCost, 0);

  if (systemCost > 0) {
    roadmap.push({
      phase: 'System Implementation',
      timeline: 'Months 2-3',
      cost: systemCost,
      department: 'IT',
    });
  }

  // Phase 3: Training & Onboarding (Month 3-4)
  const trainingCost = estimate.costDrivers
    .filter((d) => d.category === 'TRAINING')
    .reduce((sum, d) => sum + d.estimatedCost, 0);

  if (trainingCost > 0) {
    roadmap.push({
      phase: 'Training & Onboarding',
      timeline: 'Months 3-4',
      cost: trainingCost,
      department: 'HR',
    });
  }

  // Phase 4: Audit & Validation (Month 4-5)
  const auditCost = estimate.costDrivers
    .filter((d) => d.category === 'AUDIT')
    .reduce((sum, d) => sum + d.estimatedCost, 0);

  if (auditCost > 0) {
    roadmap.push({
      phase: 'Audit & Validation',
      timeline: 'Months 4-5',
      cost: auditCost,
      department: 'COMPLIANCE',
    });
  }

  // Phase 5: Ongoing Operations (Year 1+)
  roadmap.push({
    phase: 'Ongoing Operations',
    timeline: 'Year 1+',
    cost: estimate.recurringCostAnnual,
    department: 'COMPLIANCE',
  });

  return roadmap;
}

/**
 * Generate risk analysis
 */
function generateRiskAnalysis(
  estimate: CostEstimate,
  scenarios: ScenarioAnalysis
): BoardReport['riskAnalysis'] {
  const riskFactors: string[] = [];
  const mitigationStrategies: string[] = [];

  // Budget overrun risk
  if (estimate.confidence < 0.8) {
    riskFactors.push(
      'Budget uncertainty: Estimate confidence below 80% may result in cost overruns'
    );
    mitigationStrategies.push(
      'Conduct detailed vendor assessment and request fixed-price quotes where possible'
    );
  }

  // Implementation timeline risk
  const hasMultipleDepts = estimate.departmentBreakdown.length >= 3;
  if (hasMultipleDepts) {
    riskFactors.push(
      'Coordination complexity: Multiple departments involved in implementation'
    );
    mitigationStrategies.push(
      'Establish cross-functional steering committee with clear ownership'
    );
  }

  // Personnel availability risk
  const totalFTE = estimate.departmentBreakdown.reduce(
    (sum, d) => sum + d.fteImpact,
    0
  );
  if (totalFTE > 2) {
    riskFactors.push(
      `Resource demand: ${totalFTE.toFixed(1)} FTE required - may impact other projects`
    );
    mitigationStrategies.push(
      'Consider external consultants or contractors to supplement internal resources'
    );
  }

  // Delay penalty risk
  const delayCost =
    scenarios.delay90Days.threeYearTotal - scenarios.standard.threeYearTotal;
  if (delayCost > estimate.oneTimeCostLow * 0.2) {
    riskFactors.push(
      `Delay penalties: Postponing implementation increases costs by $${Math.round(delayCost).toLocaleString()}`
    );
    mitigationStrategies.push(
      'Fast-track critical path items and secure executive commitment'
    );
  }

  // Add standard mitigation strategies
  mitigationStrategies.push(
    'Implement phased approach to distribute costs and reduce risk exposure'
  );
  mitigationStrategies.push(
    'Establish continuous monitoring to track actuals vs. estimates'
  );

  return { riskFactors, mitigationStrategies };
}

/**
 * Format board report as HTML for printing
 */
export function formatBoardReportHTML(report: BoardReport): string {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Board Compliance Cost Report</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 1200px; margin: 40px auto; padding: 20px; }
    h1 { color: #1a202c; border-bottom: 3px solid #3182ce; padding-bottom: 10px; }
    h2 { color: #2d3748; margin-top: 30px; border-bottom: 1px solid #cbd5e0; padding-bottom: 8px; }
    .summary { background: #f7fafc; border-left: 4px solid #3182ce; padding: 20px; margin: 20px 0; }
    .metric { display: inline-block; margin: 10px 20px 10px 0; }
    .metric-label { font-size: 0.9em; color: #718096; }
    .metric-value { font-size: 1.5em; font-weight: bold; color: #1a202c; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #2d3748; color: white; padding: 12px; text-align: left; }
    td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
    tr:hover { background: #f7fafc; }
    .insight { margin: 10px 0; padding: 10px; background: #edf2f7; border-radius: 4px; }
    .recommended { background: #c6f6d5; font-weight: bold; }
    ul { list-style-type: none; padding-left: 0; }
    li:before { content: "▸ "; color: #3182ce; font-weight: bold; }
    @media print { body { margin: 0; } .no-print { display: none; } }
  </style>
</head>
<body>
  <h1>Regulatory Compliance Cost Analysis</h1>
  
  <div class="summary">
    <h2>Executive Summary</h2>
    <p><strong>Regulation:</strong> ${report.executiveSummary.regulationTitle}</p>
    <p><strong>Jurisdiction:</strong> ${report.executiveSummary.jurisdiction}</p>
    <p><strong>Report Date:</strong> ${report.executiveSummary.reportDate.toLocaleDateString()}</p>
    
    <div class="metric">
      <div class="metric-label">One-Time Investment</div>
      <div class="metric-value">${formatCurrency(report.executiveSummary.totalOneTimeCost.low)} - ${formatCurrency(report.executiveSummary.totalOneTimeCost.high)}</div>
    </div>
    
    <div class="metric">
      <div class="metric-label">Annual Recurring Cost</div>
      <div class="metric-value">${formatCurrency(report.executiveSummary.totalRecurringCost)}</div>
    </div>
    
    <div class="metric">
      <div class="metric-label">3-Year Exposure</div>
      <div class="metric-value">${formatCurrency(report.executiveSummary.threeYearExposure.low)} - ${formatCurrency(report.executiveSummary.threeYearExposure.high)}</div>
    </div>
    
    <p><strong>Confidence Level:</strong> ${Math.round(report.executiveSummary.confidence * 100)}% (${report.executiveSummary.methodology})</p>
  </div>

  <h2>Key Insights</h2>
  ${report.keyInsights.map((insight) => `<div class="insight">${insight}</div>`).join('')}

  <h2>Department Impact Analysis</h2>
  <table>
    <thead>
      <tr>
        <th>Department</th>
        <th>One-Time Cost</th>
        <th>Annual Cost</th>
        <th>FTE Impact</th>
        <th>Budget Code</th>
      </tr>
    </thead>
    <tbody>
      ${report.departmentImpact
        .map(
          (dept) => `
        <tr>
          <td>${dept.department}</td>
          <td>${formatCurrency(dept.oneTimeCost)}</td>
          <td>${formatCurrency(dept.recurringCost)}</td>
          <td>${dept.fteImpact}</td>
          <td>${dept.budgetCode}</td>
        </tr>
      `
        )
        .join('')}
    </tbody>
  </table>

  <h2>Implementation Scenarios</h2>
  <table>
    <thead>
      <tr>
        <th>Scenario</th>
        <th>3-Year Total</th>
        <th>Risk Level</th>
        <th>Notes</th>
      </tr>
    </thead>
    <tbody>
      ${report.scenarios
        .map(
          (scenario) => `
        <tr class="${scenario.key === report.recommendedScenario ? 'recommended' : ''}">
          <td><strong>${scenario.name}</strong><br/><small>${scenario.description}</small></td>
          <td>${formatCurrency(scenario.threeYearTotal)}</td>
          <td>${scenario.riskLevel}</td>
          <td>${scenario.recommendationReason || '-'}</td>
        </tr>
      `
        )
        .join('')}
    </tbody>
  </table>

  <h2>Implementation Roadmap</h2>
  <table>
    <thead>
      <tr>
        <th>Phase</th>
        <th>Timeline</th>
        <th>Cost</th>
        <th>Owner</th>
      </tr>
    </thead>
    <tbody>
      ${report.implementationRoadmap
        .map(
          (phase) => `
        <tr>
          <td>${phase.phase}</td>
          <td>${phase.timeline}</td>
          <td>${formatCurrency(phase.cost)}</td>
          <td>${phase.department}</td>
        </tr>
      `
        )
        .join('')}
    </tbody>
  </table>

  <h2>Risk Analysis</h2>
  <h3>Risk Factors</h3>
  <ul>
    ${report.riskAnalysis.riskFactors.map((risk) => `<li>${risk}</li>`).join('')}
  </ul>
  
  <h3>Mitigation Strategies</h3>
  <ul>
    ${report.riskAnalysis.mitigationStrategies.map((strategy) => `<li>${strategy}</li>`).join('')}
  </ul>
</body>
</html>
  `;
}

/**
 * Export board report as JSON
 */
export function exportBoardReportJSON(report: BoardReport): string {
  return JSON.stringify(report, null, 2);
}
