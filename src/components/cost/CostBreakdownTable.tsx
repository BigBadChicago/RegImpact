

'use client';

/**
 * CostBreakdownTable Component
 * Displays comprehensive cost estimate breakdown with scenarios and departments
 */

import { useState } from 'react';
import { Department, type CostEstimate, type ScenarioAnalysis } from '@/types/cost-estimate';
import SummaryCard from './SummaryCard';
import DepartmentRow from './DepartmentRow';
import ScenarioCard from './ScenarioCard';
import { formatCurrency } from './cost-utils';

interface CostBreakdownTableProps {
  estimate: CostEstimate;
  scenarios?: ScenarioAnalysis;
  regulationTitle?: string;
}

export default function CostBreakdownTable({
  estimate,
  scenarios,
  regulationTitle,
}: CostBreakdownTableProps) {
  const [expandedDepartment, setExpandedDepartment] = useState<Department | null>(null);

  // Calculate 3-year total
  const threeYearTotalLow = estimate.oneTimeCostLow + estimate.recurringCostAnnual * 3;
  const threeYearTotalHigh = estimate.oneTimeCostHigh + estimate.recurringCostAnnual * 3;

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4">
      {/* Header */}
      {regulationTitle && (
        <div className="bg-white shadow-md rounded-lg p-6 border-l-4 border-green-600">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Cost Estimate
          </h2>
          <p className="text-gray-600">{regulationTitle}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          label="One-Time Cost"
          value={`${formatCurrency(estimate.oneTimeCostLow)} - ${formatCurrency(
            estimate.oneTimeCostHigh
          )}`}
          description="Initial implementation and setup"
        />
        <SummaryCard
          label="Annual Recurring Cost"
          value={formatCurrency(estimate.recurringCostAnnual)}
          description="Ongoing compliance and maintenance"
        />
        <SummaryCard
          label="3-Year Total Exposure"
          value={`${formatCurrency(threeYearTotalLow)} - ${formatCurrency(
            threeYearTotalHigh
          )}`}
          description="Total cost of compliance over 3 years"
          accentClassName="border-2 border-blue-200"
          valueClassName="text-blue-700"
        />
      </div>

      {/* Confidence Indicator */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">
            Estimate Confidence
          </h3>
          <span className="text-sm font-semibold text-gray-700">
            {Math.round(estimate.confidence * 100)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-green-600 h-3 rounded-full transition-all"
            style={{ width: `${estimate.confidence * 100}%` }}
          />
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Method: {estimate.estimationMethod === 'AI_CALIBRATED' ? 'AI-Powered with Company Calibration' : 'Deterministic Analysis'}
        </p>
      </div>

      {/* Department Breakdown */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Department Cost Breakdown
        </h3>
        <div className="space-y-2">
          {estimate.departmentBreakdown.map((dept) => (
            <DepartmentRow
              key={dept.department}
              dept={dept}
              isExpanded={expandedDepartment === dept.department}
              onToggle={() =>
                setExpandedDepartment(
                  expandedDepartment === dept.department ? null : dept.department
                )
              }
            />
          ))}
        </div>
      </div>

      {/* Scenario Comparison */}
      {scenarios && (
        <div className="bg-white shadow-md rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Implementation Scenarios
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <ScenarioCard
              scenario={scenarios.minimal}
              isRecommended={scenarios.recommended === 'minimal'}
            />
            <ScenarioCard
              scenario={scenarios.standard}
              isRecommended={scenarios.recommended === 'standard'}
            />
            <ScenarioCard
              scenario={scenarios.bestInClass}
              isRecommended={scenarios.recommended === 'bestInClass'}
            />
            <ScenarioCard
              scenario={scenarios.delay90Days}
              isRecommended={scenarios.recommended === 'delay90Days'}
              wrapperClassName="border-red-200 bg-red-50"
            />
          </div>
        </div>
      )}
    </div>
  );
}
