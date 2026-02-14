

'use client';

/**
 * CostBreakdownTable Component
 * Displays comprehensive cost estimate breakdown with scenarios and departments
 */

import { useState } from 'react';
import { Department, RiskLevel, type CostEstimate, type ScenarioAnalysis } from '@/types/cost-estimate';

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getRiskColor = (risk: RiskLevel) => {
    switch (risk) {
      case RiskLevel.MINIMAL:
        return 'text-green-700 bg-green-50 border-green-200';
      case RiskLevel.LOW:
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case RiskLevel.MEDIUM:
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case RiskLevel.HIGH:
        return 'text-red-700 bg-red-50 border-red-200';
    }
  };

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
        {/* One-Time Cost */}
        <div className="bg-white shadow-md rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-1">One-Time Cost</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(estimate.oneTimeCostLow)} - {formatCurrency(estimate.oneTimeCostHigh)}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Initial implementation and setup
          </div>
        </div>

        {/* Recurring Annual Cost */}
        <div className="bg-white shadow-md rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-1">Annual Recurring Cost</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(estimate.recurringCostAnnual)}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Ongoing compliance and maintenance
          </div>
        </div>

        {/* 3-Year Total */}
        <div className="bg-white shadow-md rounded-lg p-6 border-2 border-blue-200">
          <div className="text-sm text-gray-600 mb-1">3-Year Total Exposure</div>
          <div className="text-2xl font-bold text-blue-700">
            {formatCurrency(threeYearTotalLow)} - {formatCurrency(threeYearTotalHigh)}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Total cost of compliance over 3 years
          </div>
        </div>
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
            <div key={dept.department} className="border border-gray-200 rounded-md overflow-hidden">
              {/* Department Header */}
              <button
                onClick={() =>
                  setExpandedDepartment(
                    expandedDepartment === dept.department ? null : dept.department
                  )
                }
                className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex justify-between items-center"
              >
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-gray-900">{dept.department}</span>
                  <span className="text-sm text-gray-600">
                    {dept.fteImpact} FTE
                  </span>
                  <span className="text-xs text-gray-500">
                    {dept.budgetCode}
                  </span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-sm text-gray-600">One-Time</div>
                    <div className="font-semibold text-gray-900">
                      {formatCurrency(dept.oneTimeCost)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">Annual</div>
                    <div className="font-semibold text-gray-900">
                      {formatCurrency(dept.recurringCostAnnual)}
                    </div>
                  </div>
                  <svg
                    className={`w-5 h-5 text-gray-600 transition-transform ${
                      expandedDepartment === dept.department ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </button>

              {/* Expanded Line Items */}
              {expandedDepartment === dept.department && (
                <div className="px-4 py-3 bg-white space-y-2">
                  {dept.lineItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-start p-2 hover:bg-gray-50 rounded">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {item.description}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {item.category} • {item.isOneTime ? 'One-time' : 'Recurring'} • Confidence: {Math.round(item.confidence * 100)}%
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-gray-900 ml-4">
                        {formatCurrency(item.estimatedCost)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
            {/* Minimal */}
            <div className={`border-2 rounded-lg p-4 ${scenarios.recommended === 'minimal' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-gray-900">{scenarios.minimal.name}</h4>
                {scenarios.recommended === 'minimal' && (
                  <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">
                    Recommended
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-600 mb-3">{scenarios.minimal.description}</p>
              <div className="space-y-2">
                <div>
                  <div className="text-xs text-gray-600">3-Year Total</div>
                  <div className="text-lg font-bold text-gray-900">
                    {formatCurrency(scenarios.minimal.threeYearTotal)}
                  </div>
                </div>
                <div className={`text-xs px-2 py-1 rounded border ${getRiskColor(scenarios.minimal.riskLevel)}`}>
                  {scenarios.minimal.riskLevel} Risk
                </div>
              </div>
            </div>

            {/* Standard */}
            <div className={`border-2 rounded-lg p-4 ${scenarios.recommended === 'standard' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-gray-900">{scenarios.standard.name}</h4>
                {scenarios.recommended === 'standard' && (
                  <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">
                    Recommended
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-600 mb-3">{scenarios.standard.description}</p>
              <div className="space-y-2">
                <div>
                  <div className="text-xs text-gray-600">3-Year Total</div>
                  <div className="text-lg font-bold text-gray-900">
                    {formatCurrency(scenarios.standard.threeYearTotal)}
                  </div>
                </div>
                <div className={`text-xs px-2 py-1 rounded border ${getRiskColor(scenarios.standard.riskLevel)}`}>
                  {scenarios.standard.riskLevel} Risk
                </div>
              </div>
            </div>

            {/* Best-in-Class */}
            <div className={`border-2 rounded-lg p-4 ${scenarios.recommended === 'bestInClass' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-gray-900">{scenarios.bestInClass.name}</h4>
                {scenarios.recommended === 'bestInClass' && (
                  <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">
                    Recommended
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-600 mb-3">{scenarios.bestInClass.description}</p>
              <div className="space-y-2">
                <div>
                  <div className="text-xs text-gray-600">3-Year Total</div>
                  <div className="text-lg font-bold text-gray-900">
                    {formatCurrency(scenarios.bestInClass.threeYearTotal)}
                  </div>
                </div>
                <div className={`text-xs px-2 py-1 rounded border ${getRiskColor(scenarios.bestInClass.riskLevel)}`}>
                  {scenarios.bestInClass.riskLevel} Risk
                </div>
              </div>
            </div>

            {/* Delay 90 Days */}
            <div className={`border-2 rounded-lg p-4 ${scenarios.recommended === 'delay90Days' ? 'border-blue-500 bg-blue-50' : 'border-red-200 bg-red-50'}`}>
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-gray-900">{scenarios.delay90Days.name}</h4>
                {scenarios.recommended === 'delay90Days' && (
                  <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">
                    Recommended
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-600 mb-3">{scenarios.delay90Days.description}</p>
              <div className="space-y-2">
                <div>
                  <div className="text-xs text-gray-600">3-Year Total</div>
                  <div className="text-lg font-bold text-gray-900">
                    {formatCurrency(scenarios.delay90Days.threeYearTotal)}
                  </div>
                </div>
                <div className={`text-xs px-2 py-1 rounded border ${getRiskColor(scenarios.delay90Days.riskLevel)}`}>
                  {scenarios.delay90Days.riskLevel} Risk
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
