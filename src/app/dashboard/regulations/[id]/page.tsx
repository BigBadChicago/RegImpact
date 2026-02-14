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

  // Check if cost estimate exists for latest version
  const latestVersion = regulation.versions[0];
  const costEstimate = latestVersion
    ? await prisma.costEstimate.findFirst({
        where: {
          regulationVersionId: latestVersion.id,
          customerId: user.customerId,
        },
      })
    : null;

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

          {/* Action Buttons */}
          {latestVersion && (
            <div className="mt-4 flex gap-3">
              <Link
                href={`/dashboard/regulations/${latestVersion.id}/cost`}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors"
              >
                <svg
                  className="w-5 h-5 mr-2"
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
                {costEstimate ? 'View Cost Estimate' : 'Generate Cost Estimate'}
              </Link>
              {costEstimate && (
                <span className="inline-flex items-center px-3 py-2 bg-green-100 text-green-800 rounded-md text-sm font-medium">
                  <svg
                    className="w-4 h-4 mr-1.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Estimate Available
                </span>
              )}
            </div>
          )}
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
