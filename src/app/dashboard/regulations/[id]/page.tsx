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
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <Link href="/dashboard" className="hover:text-blue-600">
              Dashboard
            </Link>
            <span>/</span>
            <Link href="/dashboard/regulations" className="hover:text-blue-600">
              Regulations
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">{regulation.title}</span>
          </div>

          {/* Regulation Title and Metadata */}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {regulation.title}
          </h1>
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <div>
              <span className="font-medium">Jurisdiction:</span>{' '}
              {regulation.jurisdiction?.name}
            </div>
            <div>
              <span className="font-medium">Type:</span> {regulation.regulationType}
            </div>
            {regulation.effectiveDate && (
              <div>
                <span className="font-medium">Effective Date:</span>{' '}
                {formatDate(regulation.effectiveDate)}
              </div>
            )}
            <div>
              <span className="font-medium">Versions:</span>{' '}
              {regulation.versions.length}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {regulation.versions.length < 2 ? (
          <div className="bg-white shadow-md rounded-lg p-6 text-center">
            <p className="text-gray-600 mb-4">
              You need at least 2 versions to compare
            </p>
            <p className="text-gray-500 text-sm">
              Current versions available: {regulation.versions.length}
            </p>
          </div>
        ) : (
          <DiffComparison
            regulationId={id}
            versions={regulation.versions}
          />
        )}
      </main>
    </div>
  );
}
