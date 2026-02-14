'use client';

/**
 * Cost Estimate Detail Page
 * Displays comprehensive cost analysis for a regulation
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import CostBreakdownTable from '@/components/cost/CostBreakdownTable';
import type {
  CostEstimate,
  CostDriver,
  DepartmentCostBreakdown,
  ScenarioAnalysis,
} from '@/types/cost-estimate';
import { Department } from '@/types/cost-estimate';
import {
  generateBoardReport,
  formatBoardReportHTML,
  exportBoardReportJSON,
} from '@/lib/reports/board-report-generator';

interface CostEstimateResponse extends CostEstimate {
  scenarios?: ScenarioAnalysis;
  regulationTitle?: string;
  jurisdiction?: string;
}

function normalizeEstimate(raw: CostEstimateResponse): CostEstimateResponse {
  const rawDrivers = Array.isArray((raw as CostEstimateResponse).costDrivers)
    ? (raw as CostEstimateResponse).costDrivers
    : (raw as { costDriversJson?: { drivers?: unknown[] } }).costDriversJson
        ?.drivers || [];

  const costDrivers: CostDriver[] = (rawDrivers as Array<Record<string, unknown>>)
    .map((driver, index) => ({
      id: (driver.id as string) || `driver-${index + 1}`,
      category: driver.category as CostDriver['category'],
      description: (driver.description as string) || 'Unspecified driver',
      isOneTime: Boolean(driver.isOneTime),
      estimatedCost: Number(driver.estimatedCost || 0),
      confidence: Number(driver.confidence || 0.7),
      department: (driver.department as Department) || Department.IT,
      evidence: driver.evidence as CostDriver['evidence'],
      notes: driver.notes as CostDriver['notes'],
      departmentAlternatives: driver.departmentAlternatives as CostDriver['departmentAlternatives'],
    }))
    .filter((driver) => Boolean(driver.description));

  const rawDepartments = Array.isArray((raw as CostEstimateResponse).departmentBreakdown)
    ? (raw as CostEstimateResponse).departmentBreakdown
    : (raw as { departmentBreakdown?: { departments?: unknown[] } }).departmentBreakdown
        ?.departments || [];

  const departmentBreakdown: DepartmentCostBreakdown[] = (
    rawDepartments as Array<Record<string, unknown>>
  ).map((dept) => {
    const department = (dept.department as Department) || Department.IT;
    return {
      department,
      oneTimeCost: Number(dept.oneTimeCost || 0),
      recurringCostAnnual: Number(dept.recurringCostAnnual || 0),
      fteImpact: Number(dept.fteImpact || 0),
      budgetCode: dept.budgetCode as string,
      lineItems: costDrivers.filter((driver) => driver.department === department),
    };
  });

  return {
    ...raw,
    costDrivers,
    departmentBreakdown,
  };
}

export default function CostEstimatePage() {
  const params = useParams();
  const router = useRouter();
  const regulationVersionId = params.id as string;

  const [estimate, setEstimate] = useState<CostEstimateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch existing estimate
  useEffect(() => {
    async function fetchEstimate() {
      try {
        const response = await fetch(
          `/api/regulations/${regulationVersionId}/cost-estimate`
        );

        if (response.ok) {
          const data = (await response.json()) as CostEstimateResponse;
          setEstimate(normalizeEstimate(data));
        } else if (response.status === 404) {
          // No estimate exists yet
          setEstimate(null);
        } else {
          setError('Failed to fetch cost estimate');
        }
      } catch (err) {
        console.error('Error fetching estimate:', err);
        setError('Failed to load cost estimate');
      } finally {
        setLoading(false);
      }
    }

    fetchEstimate();
  }, [regulationVersionId]);

  // Generate new estimate
  async function handleGenerateEstimate() {
    setGenerating(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/regulations/${regulationVersionId}/cost-estimate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            useAI: false, // Use deterministic by default to minimize costs
          }),
        }
      );

      if (response.ok) {
        const data = (await response.json()) as CostEstimateResponse;
        setEstimate(normalizeEstimate(data));
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to generate cost estimate');
      }
    } catch (err) {
      console.error('Error generating estimate:', err);
      setError('Failed to generate cost estimate');
    } finally {
      setGenerating(false);
    }
  }

  // Export board report as HTML
  function handleExportHTML() {
    if (!estimate || !estimate.scenarios) return;

    const report = generateBoardReport(
      estimate,
      estimate.scenarios,
      estimate.regulationTitle || 'Regulation',
      estimate.jurisdiction || 'Unknown'
    );

    const html = formatBoardReportHTML(report);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `board-report-${regulationVersionId}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Export board report as JSON
  function handleExportJSON() {
    if (!estimate || !estimate.scenarios) return;

    const report = generateBoardReport(
      estimate,
      estimate.scenarios,
      estimate.regulationTitle || 'Regulation',
      estimate.jurisdiction || 'Unknown'
    );

    const json = exportBoardReportJSON(report);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cost-estimate-${regulationVersionId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading cost estimate...</p>
        </div>
      </div>
    );
  }

  if (!estimate) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white shadow-md rounded-lg p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Cost Estimate Not Available
            </h1>
            <p className="text-gray-600 mb-6">
              No cost estimate has been generated for this regulation yet.
            </p>
            <button
              onClick={handleGenerateEstimate}
              disabled={generating}
              className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {generating ? (
                <>
                  <span className="inline-block animate-spin mr-2">⏳</span>
                  Generating Estimate...
                </>
              ) : (
                'Generate Cost Estimate'
              )}
            </button>
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header Actions */}
        <div className="mb-6 flex justify-between items-center">
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to Regulation
          </button>
          <div className="flex gap-3">
            <button
              onClick={handleExportJSON}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors text-sm font-medium"
            >
              Export JSON
            </button>
            <button
              onClick={handleExportHTML}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
            >
              Export Board Report
            </button>
          </div>
        </div>

        {/* Cost Breakdown */}
        <CostBreakdownTable
          estimate={estimate}
          scenarios={estimate.scenarios}
          regulationTitle={estimate.regulationTitle}
        />

        {/* Additional Actions */}
        <div className="mt-8 bg-white shadow-md rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Actions
          </h3>
          <div className="space-y-3">
            <button
              onClick={handleGenerateEstimate}
              disabled={generating}
              className="w-full bg-blue-600 text-white px-4 py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {generating ? 'Regenerating...' : 'Regenerate Estimate'}
            </button>
            <button
              onClick={() =>
                router.push(
                  `/dashboard/regulations/${regulationVersionId}/cost-feedback`
                )
              }
              className="w-full bg-gray-200 text-gray-900 px-4 py-3 rounded-md hover:bg-gray-300 transition-colors font-medium"
            >
              Submit Actual Costs (Learning Feedback)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
