import React from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/auth.config';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { DeadlineTable } from '@/components/dashboard/DeadlineTable';
import { RecentChanges } from '@/components/dashboard/RecentChanges';
import type { DashboardData } from '@/types/dashboard';

/**
 * Simple icon components using text
 */
const DollarSign = () => <span className="text-blue-600">💰</span>;
const FileCheck = () => <span className="text-blue-600">📄</span>;
const AlertCircle = () => <span className="text-blue-600">⚠️</span>;
const TrendingUp = () => <span className="text-blue-600">📈</span>;

/**
 * Main dashboard page - server component
 * Fetches dashboard data and displays metrics, upcoming deadlines, and recent changes
 */
async function DashboardPageContent(): Promise<React.ReactElement> {
  // Check authentication
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  let dashboardData: DashboardData | null = null;
  let error: string | null = null;

  try {
    // Fetch dashboard data from API
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/dashboard`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${Object.entries(session).map(([key]) => `${key}=${session[key as keyof typeof session]}`).join('; ')}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch dashboard data: ${response.statusText}`);
    }

    dashboardData = await response.json();
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load dashboard data';
    console.error('Dashboard page error:', err);
  }

  if (error || !dashboardData) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-6">
        <h2 className="text-lg font-semibold text-red-900 mb-2">Unable to Load Dashboard</h2>
        <p className="text-red-800 mb-4">{error || 'An unexpected error occurred'}</p>
        <p className="text-sm text-red-700">Please try refreshing the page or contact support if the problem persists.</p>
      </div>
    );
  }

  /**
   * Format currency values
   */
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Exposure"
          value={formatCurrency(dashboardData.totalExposure)}
          icon={<DollarSign />}
          subtitle="Regulatory exposure value"
          trend="up"
        />
        <MetricCard
          title="Regulations Monitored"
          value={dashboardData.regulationCount}
          icon={<FileCheck />}
          subtitle="Active regulations"
        />
        <MetricCard
          title="Critical Deadlines"
          value={dashboardData.criticalDeadlines}
          icon={<AlertCircle />}
          subtitle="Deadlines within 30 days"
          trend="down"
        />
        <MetricCard
          title="High-Risk Changes"
          value={dashboardData.highRiskChanges}
          icon={<TrendingUp />}
          subtitle="Recent significant changes"
        />
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Deadlines - 60% width on desktop */}
        <div className="lg:col-span-2">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900">Upcoming Deadlines</h2>
            <p className="text-sm text-gray-500 mt-1">Critical compliance dates and milestones</p>
          </div>
          <DeadlineTable deadlines={dashboardData.upcomingDeadlines} />
        </div>

        {/* Recent Changes - 40% width on desktop */}
        <div className="lg:col-span-1">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900">Recent Changes</h2>
            <p className="text-sm text-gray-500 mt-1">Latest regulatory updates</p>
          </div>
          <RecentChanges changes={dashboardData.recentChanges} />
        </div>
      </div>
    </div>
  );
}

/**
 * Dashboard page with layout wrapper
 */
export default function DashboardPage(): React.ReactElement {
  return <DashboardPageContent />;
}
