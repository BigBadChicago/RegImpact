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

  return (
    <div className="min-h-screen app-shell text-[var(--ui-ink)]">
      {/* Header */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-white/70" />
        <div className="relative max-w-7xl mx-auto px-6 py-10">
          <p className="text-xs uppercase tracking-[0.4em] text-muted">Executive Dashboard</p>
          <h1 className="mt-4 text-4xl font-display">
            Welcome back, {user.name || user.email}
          </h1>
          <p className="text-muted mt-2">
            Monitoring {user.customer.companyName} on the {user.customer.subscriptionTier} plan.
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-10 flex flex-col gap-10">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="app-card-strong p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Total Regulations</p>
            <p className="mt-4 text-3xl font-display">{regulationCount}</p>
          </div>

          <div className="app-card-strong p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Policy Changes Analyzed</p>
            <p className="mt-4 text-3xl font-display">{policyDiffCount}</p>
          </div>

          <div className="app-card-strong p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Company</p>
            <p className="mt-4 text-2xl font-display">{user.customer.companyName}</p>
            <p className="text-sm text-muted mt-2">{user.customer.subscriptionTier} Plan</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="app-card-strong p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display">Quick Actions</h2>
            <span className="text-xs uppercase tracking-[0.3em] text-muted">Jump in</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <Link
              href="/dashboard/regulations"
              className="app-card p-5 transition-transform hover:-translate-y-1"
            >
              <h3 className="font-display text-lg">Regulations</h3>
              <p className="text-sm text-muted mt-2">
                Browse and compare regulation versions.
              </p>
            </Link>

            <Link
              href="/dashboard/deadlines"
              className="app-card p-5 transition-transform hover:-translate-y-1"
            >
              <h3 className="font-display text-lg">Deadlines</h3>
              <p className="text-sm text-muted mt-2">
                Track upcoming compliance obligations.
              </p>
            </Link>

            <div className="app-card p-5 opacity-70">
              <h3 className="font-display text-lg">Cost Estimates</h3>
              <p className="text-sm text-muted mt-2">
                Coming soon - View compliance cost projections.
              </p>
            </div>

            <div className="app-card p-5 opacity-70">
              <h3 className="font-display text-lg">Settings</h3>
              <p className="text-sm text-muted mt-2">
                Coming soon - Configure monitoring preferences.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
