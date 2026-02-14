/**
 * Portfolio Analytics Page
 * Advanced cost analysis with sensitivity and forecasting insights
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import { auth } from '@/auth.config';
import {
  aggregatePortfolioTrends,
  forecastPortfolioTrends,
  calculateImplementationCost,
} from '@/lib/cost-estimator';
import { CostEstimate } from '@/types/cost-estimate';

export default async function PortfolioAnalyticsPage() {
  // Authenticate
  const session = await auth();
  if (!session?.user?.email) {
    redirect('/login');
  }

  // Fetch user and their customer
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { customer: true },
  });

  if (!user?.customerId) {
    redirect('/login');
  }

  // Fetch all cost estimates with regulation details
  const costEstimates = await prisma.costEstimate.findMany({
    where: { customerId: user.customerId },
    include: {
      regulationVersion: {
        include: {
          regulation: {
            include: {
              jurisdiction: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Convert database records to domain objects for analysis
  const estimates: CostEstimate[] = costEstimates.map((est) => ({
    regulationId: est.regulationVersionId,
    regulationTitle: est.regulationVersion.regulation.title,
    customerId: est.customerId,
    oneTimeCostLow: est.oneTimeCostLow,
    oneTimeCostHigh: est.oneTimeCostHigh,
    oneTimeCostMid:
      (est.oneTimeCostLow + est.oneTimeCostHigh) / 2,
    recurringCostAnnual: est.recurringCostAnnual,
    recurringCostLow: est.recurringCostAnnual * 0.85,
    recurringCostHigh: est.recurringCostAnnual * 1.15,
    departmentBreakdown: est.departmentBreakdown as Record<
      string,
      { oneTime: number; recurring: number }
    > || {},
    confidenceLow:
      typeof est.confidence === 'number' ? est.confidence : 0.7,
    confidenceHigh:
      typeof est.confidence === 'number' ? est.confidence : 0.85,
    drivers: est.drivers as Array<{
      category: string;
      oneTime?: number;
      recurring?: number;
    }> || [],
    scenarios: est.scenarios as Array<{
      name: string;
      cost: number;
    }> || [],
  }));

  // Aggregate portfolio trends
  const portfolioTrends = aggregatePortfolioTrends(estimates);

  // Generate 3-year forecast
  const forecast = forecastPortfolioTrends(portfolioTrends, 3);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Sort departments by total cost
  const departmentsByTotalCost = Object.entries(
    portfolioTrends.costsByDepartment
  )
    .map(([dept, { oneTime, recurring }]) => ({
      department: dept,
      oneTime,
      recurring,
      total: oneTime + recurring * 3, // 3-year total
    }))
    .sort((a, b) => b.total - a.total);

  // Get top risk drivers
  const topRisks = portfolioTrends.riskByLevel;
  const combinedRiskCount =
    topRisks.high + topRisks.medium + topRisks.low;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Portfolio Analytics
              </h1>
              <p className="text-gray-600 mt-1">
                Advanced cost analysis with forecasting and sensitivity insights
              </p>
            </div>
            <Link
              href="/dashboard/cost-estimates"
              className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors"
            >
              Back to Estimates
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Portfolio Summary */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Portfolio Summary
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 font-medium">
                One-Time Costs
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatCurrency(portfolioTrends.totalOneTime)}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Across {estimates.length} regulation{estimates.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 font-medium">
                Annual Recurring
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatCurrency(
                  portfolioTrends.totalRecurring
                )}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Year 1 ongoing costs
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 font-medium">
                3-Year Total
              </p>
              <p className="text-2xl font-bold text-blue-600 mt-2">
                {formatCurrency(
                  portfolioTrends.totalOneTime +
                    portfolioTrends.totalRecurring * 3
                )}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Full impact horizon
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 font-medium">
                Risk Profile
              </p>
              <div className="mt-2 flex gap-2">
                <span className="inline-block px-2 py-1 text-xs font-bold text-white bg-red-600 rounded">
                  H: {topRisks.high}
                </span>
                <span className="inline-block px-2 py-1 text-xs font-bold text-white bg-yellow-600 rounded">
                  M: {topRisks.medium}
                </span>
                <span className="inline-block px-2 py-1 text-xs font-bold text-white bg-green-600 rounded">
                  L: {topRisks.low}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {combinedRiskCount} total drivers identified
              </p>
            </div>
          </div>
        </section>

        {/* 3-Year Forecast */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            3-Year Cost Forecast
          </h2>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">
                      Year
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">
                      One-Time
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">
                      Recurring
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">
                      Annual Total
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">
                      Cumulative
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {forecast.years.map((year, idx) => (
                    <tr
                      key={idx}
                      className="border-b hover:bg-gray-50"
                    >
                      <td className="py-3 px-4 font-medium text-gray-900">
                        Year {year.year}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-600">
                        {formatCurrency(year.oneTime)}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-600">
                        {formatCurrency(year.recurring)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-gray-900">
                        {formatCurrency(
                          year.oneTime + year.recurring
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-blue-600">
                        {formatCurrency(year.cumulative)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
              <p>
                <strong>Forecast Note:</strong> Based on current regulations
                and estimates. Includes {forecast.inflationRate * 100}% annual
                inflation. Risks identified will be monitored.
              </p>
            </div>
          </div>
        </section>

        {/* Cost Breakdown by Department */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Cost Allocation by Department
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {departmentsByTotalCost.length > 0 ? (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  3-Year Impact by Department
                </h3>
                <div className="space-y-3">
                  {departmentsByTotalCost.map((dept) => (
                    <div key={dept.department}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">
                          {dept.department}
                        </span>
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(dept.total)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${
                              (dept.total /
                                Math.max(
                                  ...departmentsByTotalCost.map(
                                    (d) => d.total
                                  )
                                )) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>One-time: {formatCurrency(dept.oneTime)}</span>
                        <span>Annual: {formatCurrency(dept.recurring)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600">
                  No department data available
                </p>
              </div>
            )}

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Top Cost Drivers
              </h3>
              {portfolioTrends.topDrivers.length > 0 ? (
                <div className="space-y-3">
                  {portfolioTrends.topDrivers
                    .slice(0, 5)
                    .map((driver, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center p-2 bg-gray-50 rounded"
                      >
                        <span className="text-sm font-medium text-gray-700">
                          {driver.category}
                        </span>
                        <span className="text-sm font-bold text-gray-900">
                          {formatCurrency(driver.totalCost)}
                        </span>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-gray-600 text-sm">
                  No driver data available
                </p>
              )}
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                <p>
                  These drivers represent the categories with highest
                  financial impact across your portfolio.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Risk Analysis */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Risk Analysis
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-3 h-3 bg-red-600 rounded-full" />
                <h3 className="text-lg font-semibold text-red-900">
                  High Risk
                </h3>
              </div>
              <p className="text-3xl font-bold text-red-600 mt-2">
                {topRisks.high}
              </p>
              <p className="text-sm text-red-700 mt-2">
                {topRisks.high > 0
                  ? 'Require immediate attention'
                  : 'No high-risk items identified'}
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-3 h-3 bg-yellow-600 rounded-full" />
                <h3 className="text-lg font-semibold text-yellow-900">
                  Medium Risk
                </h3>
              </div>
              <p className="text-3xl font-bold text-yellow-600 mt-2">
                {topRisks.medium}
              </p>
              <p className="text-sm text-yellow-700 mt-2">
                {topRisks.medium > 0
                  ? 'Monitor and mitigate'
                  : 'No medium-risk items identified'}
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-3 h-3 bg-green-600 rounded-full" />
                <h3 className="text-lg font-semibold text-green-900">
                  Low Risk
                </h3>
              </div>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {topRisks.low}
              </p>
              <p className="text-sm text-green-700 mt-2">
                {topRisks.low > 0
                  ? 'Ongoing observation'
                  : 'No low-risk items identified'}
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
