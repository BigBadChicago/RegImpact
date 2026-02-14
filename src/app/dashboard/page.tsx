/**
 * Executive Dashboard Page
 * Main landing page for authenticated users
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/auth.config';
import prisma from '@/lib/prisma';

export default async function DashboardPage() {
  // Authenticate
  const session = await auth();
  if (!session?.user?.email) {
    redirect('/login');
  }

  // Fetch user
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { customer: true },
  });

  if (!user?.customerId) {
    redirect('/login');
  }

  // Fetch quick stats
  // Note: Add customer-based filtering when jurisdiction monitoring is implemented in schema
  const regulationCount = await prisma.regulation.count();
  const policyDiffCount = await prisma.policyDiff.count();
  const costEstimateCount = await prisma.costEstimate.count({
    where: { customerId: user.customerId },
  });

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Executive Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Welcome back, {user.name || user.email}
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white shadow-md rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">
              Total Regulations
            </h3>
            <p className="text-3xl font-bold text-gray-900">
              {regulationCount}
            </p>
          </div>

          <div className="bg-white shadow-md rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">
              Policy Changes Analyzed
            </h3>
            <p className="text-3xl font-bold text-gray-900">
              {policyDiffCount}
            </p>
          </div>

          <div className="bg-white shadow-md rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">
              Cost Estimates
            </h3>
            <p className="text-3xl font-bold text-gray-900">
              {costEstimateCount}
            </p>
          </div>

          <div className="bg-white shadow-md rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">
              Company
            </h3>
            <p className="text-xl font-semibold text-gray-900">
              {user.customer.companyName}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {user.customer.subscriptionTier} Plan
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/dashboard/regulations"
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <h3 className="font-semibold text-gray-900 mb-2">
                📋 View Regulations
              </h3>
              <p className="text-sm text-gray-600">
                Browse and compare regulation versions
              </p>
            </Link>

            <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 cursor-not-allowed opacity-60">
              <h3 className="font-semibold text-gray-900 mb-2">
                📅 Upcoming Deadlines
              </h3>
              <p className="text-sm text-gray-600">
                Coming soon - Track compliance deadlines
              </p>
            </div>

            <Link
              href="/dashboard/cost-estimates"
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <h3 className="font-semibold text-gray-900 mb-2">
                💰 Cost Estimates
              </h3>
              <p className="text-sm text-gray-600">
                AI-powered compliance cost projections ({costEstimateCount} estimates)
              </p>
            </Link>

            <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 cursor-not-allowed opacity-60">
              <h3 className="font-semibold text-gray-900 mb-2">
                ⚙️ Settings
              </h3>
              <p className="text-sm text-gray-600">
                Coming soon - Configure monitoring preferences
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
