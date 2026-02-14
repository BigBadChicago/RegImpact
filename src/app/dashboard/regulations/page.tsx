/**
 * Regulations List Page
 * Shows all regulations for the customer's monitored jurisdictions
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import { auth } from '@/auth.config';
import { formatDate } from '@/lib/utils/format';

export default async function RegulationsPage() {
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

  // Fetch all regulations
  // Note: Add customer-based filtering when jurisdiction monitoring is implemented in schema
  const regulations = await prisma.regulation.findMany({
    include: {
      jurisdiction: true,
      versions: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="min-h-screen app-shell text-[var(--ui-ink)]">
      {/* Header */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-white/70" />
        <div className="relative max-w-6xl mx-auto px-6 py-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Regulations</p>
            <h1 className="text-3xl font-display mt-3">Regulation Library</h1>
            <p className="text-muted text-sm mt-2">
              Monitoring {regulations.length} regulation
              {regulations.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Link
            href="/dashboard/regulations/new"
            className="rounded-full bg-[var(--ui-accent-3)] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
          >
            Add Regulation
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-10">
        {regulations.length === 0 ? (
          <div className="app-card p-12 text-center">
            <h2 className="text-xl font-display mb-2">No regulations found</h2>
            <p className="text-muted mb-6">
              Start monitoring regulations by adding a jurisdiction.
            </p>
            <Link
              href="/dashboard"
              className="inline-block rounded-full bg-[var(--ui-accent)] px-5 py-2 text-sm font-semibold text-white"
            >
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <div className="app-card-strong overflow-hidden">
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.3em] text-muted">
                  <th className="px-6 py-4 font-semibold">Title</th>
                  <th className="px-6 py-4 font-semibold">Jurisdiction</th>
                  <th className="px-6 py-4 font-semibold">Type</th>
                  <th className="px-6 py-4 font-semibold">Effective Date</th>
                  <th className="px-6 py-4 font-semibold">Versions</th>
                  <th className="px-6 py-4 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {regulations.map((regulation) => (
                  <tr
                    key={regulation.id}
                    className="border-t border-[var(--ui-border)] hover:bg-white/70 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <Link
                        href={`/dashboard/regulations/${regulation.id}`}
                        className="text-[var(--ui-accent-3)] font-semibold hover:underline"
                      >
                        {regulation.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4">{regulation.jurisdiction?.name || 'Unknown'}</td>
                    <td className="px-6 py-4">{regulation.regulationType}</td>
                    <td className="px-6 py-4">
                      {regulation.effectiveDate
                        ? formatDate(new Date(regulation.effectiveDate))
                        : '-'}
                    </td>
                    <td className="px-6 py-4 font-semibold">{regulation.versions.length}</td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/dashboard/regulations/${regulation.id}`}
                        className="text-[var(--ui-accent-3)] font-semibold hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
