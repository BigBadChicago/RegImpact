/**
 * Cost Estimates Portfolio Page
 * Executive overview of all cost estimates across regulations
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import { auth } from '@/auth.config';
import { formatDate } from '@/lib/utils/format';

export default async function CostEstimatesPage() {
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

  // Calculate portfolio totals
  const totalOneTimeLow = costEstimates.reduce(
    (sum, est) => sum + est.oneTimeCostLow,
    0
  );
  const totalOneTimeHigh = costEstimates.reduce(
    (sum, est) => sum + est.oneTimeCostHigh,
    0
  );
  const totalRecurringAnnual = costEstimates.reduce(
    (sum, est) => sum + est.recurringCostAnnual,
    0
  );
  const threeYearLow = totalOneTimeLow + totalRecurringAnnual * 3;
  const threeYearHigh = totalOneTimeHigh + totalRecurringAnnual * 3;

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Cost Estimates Portfolio
              </h1>
              <p className="text-gray-600 mt-1">
                Financial impact analysis across {costEstimates.length} regulation
                {costEstimates.length !== 1 ? 's' : ''}
              </p>
            </div>
            <Link
              href="/dashboard/regulations"
              className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors"
            >
              View Regulations
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Portfolio Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white shadow-md rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">
              Total Estimates
            </h3>
            <p className="text-3xl font-bold text-gray-900">
              {costEstimates.length}
            </p>
          </div>

          <div className="bg-white shadow-md rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">
              One-Time Costs
            </h3>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(totalOneTimeLow)} - {formatCurrency(totalOneTimeHigh)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Implementation & setup</p>
          </div>

          <div className="bg-white shadow-md rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">
              Annual Recurring
            </h3>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(totalRecurringAnnual)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Per year</p>
          </div>

          <div className="bg-white shadow-md rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">
              3-Year Total Exposure
            </h3>
            <p className="text-xl font-bold text-blue-900">
              {formatCurrency(threeYearLow)} - {formatCurrency(threeYearHigh)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Planning horizon</p>
          </div>
        </div>

        {/* Estimates List */}
        {costEstimates.length === 0 ? (
          <div className="bg-white shadow-md rounded-lg p-12 text-center">
            <div className="flex justify-center mb-4">
              <svg
                className="w-16 h-16 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No cost estimates yet
            </h2>
            <p className="text-gray-600 mb-6">
              Generate cost estimates for your monitored regulations to see financial impact analysis
            </p>
            <Link
              href="/dashboard/regulations"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors"
            >
              View Regulations
            </Link>
          </div>
        ) : (
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                All Cost Estimates
              </h2>
            </div>
            <div className="divide-y divide-gray-200">
              {costEstimates.map((estimate) => {
                const regulation = estimate.regulationVersion.regulation;
                const threeYearCostLow =
                  estimate.oneTimeCostLow + estimate.recurringCostAnnual * 3;
                const threeYearCostHigh =
                  estimate.oneTimeCostHigh + estimate.recurringCostAnnual * 3;

                return (
                  <div
                    key={estimate.id}
                    className="p-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <Link
                          href={`/dashboard/regulations/${regulation.id}/cost`}
                          className="text-lg font-semibold text-blue-600 hover:underline mb-2 block"
                        >
                          {regulation.title}
                        </Link>
                        <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-3">
                          <span className="flex items-center gap-1">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                            </svg>
                            {regulation.jurisdiction?.name}
                          </span>
                          <span className="flex items-center gap-1">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                            Estimated {formatDate(estimate.createdAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            {Math.round(estimate.confidence * 100)}% confidence
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600 block">One-Time</span>
                            <span className="font-semibold text-gray-900">
                              {formatCurrency(estimate.oneTimeCostLow)} -{' '}
                              {formatCurrency(estimate.oneTimeCostHigh)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 block">Annual</span>
                            <span className="font-semibold text-gray-900">
                              {formatCurrency(estimate.recurringCostAnnual)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 block">3-Year Total</span>
                            <span className="font-semibold text-blue-900">
                              {formatCurrency(threeYearCostLow)} -{' '}
                              {formatCurrency(threeYearCostHigh)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Link
                        href={`/dashboard/regulations/${regulation.id}/cost`}
                        className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors text-sm"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
