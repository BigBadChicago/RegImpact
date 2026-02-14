/**
 * Regulation Detail Page
 * Shows a single regulation with version history and diff viewer
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import { auth } from '@/auth.config';
import DiffComparison from '@/components/regulations/DiffComparison';
import { formatDate } from '@/lib/utils/format';

interface RegulationDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function RegulationDetailPage(
  props: RegulationDetailPageProps
) {
  const params = await props.params;
  // Authenticate
  const session = await auth();
  if (!session?.user?.email) {
    redirect('/login');
  }

  const { id } = params;

  // Fetch user and their customer
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { customer: true },
  });

  if (!user?.customerId) {
    redirect('/login');
  }

  // Fetch regulation
  const regulation = await prisma.regulation.findUnique({
    where: { id },
    include: {
      jurisdiction: true,
      versions: {
        orderBy: { versionNumber: 'desc' },
      },
    },
  });

  if (!regulation) {
    redirect('/dashboard/regulations');
  }

  return (
    <div className="min-h-screen app-shell text-[var(--ui-ink)]">
      {/* Header */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-white/70" />
        <div className="relative max-w-6xl mx-auto px-6 py-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted mb-4">
            <Link href="/dashboard" className="hover:text-[var(--ui-accent-3)]">
              Dashboard
            </Link>
            <span>/</span>
            <Link href="/dashboard/regulations" className="hover:text-[var(--ui-accent-3)]">
              Regulations
            </Link>
            <span>/</span>
            <span className="text-[var(--ui-ink)]">{regulation.title}</span>
          </div>

          {/* Regulation Title and Metadata */}
          <h1 className="text-4xl font-display mb-3">{regulation.title}</h1>
          <div className="flex flex-wrap gap-4 text-sm text-muted">
            <div>
              <span className="font-semibold text-[var(--ui-ink)]">Jurisdiction:</span>{' '}
              {regulation.jurisdiction?.name}
            </div>
            <div>
              <span className="font-semibold text-[var(--ui-ink)]">Type:</span>{' '}
              {regulation.regulationType}
            </div>
            {regulation.effectiveDate && (
              <div>
                <span className="font-semibold text-[var(--ui-ink)]">Effective Date:</span>{' '}
                {formatDate(regulation.effectiveDate)}
              </div>
            )}
            <div>
              <span className="font-semibold text-[var(--ui-ink)]">Versions:</span>{' '}
              {regulation.versions.length}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-10">
        {regulation.versions.length < 2 ? (
          <div className="app-card p-8 text-center">
            <p className="text-muted mb-4">
              You need at least 2 versions to compare.
            </p>
            <p className="text-sm text-muted">
              Current versions available: {regulation.versions.length}
            </p>
          </div>
        ) : (
          <DiffComparison regulationId={id} versions={regulation.versions} />
        )}
      </main>
    </div>
  );
}
