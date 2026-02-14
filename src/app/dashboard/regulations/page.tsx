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
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Regulations</h1>
            <p className="text-gray-600 text-sm mt-1">
              Monitoring {regulations.length} regulation
              {regulations.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Link
            href="/dashboard/regulations/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors"
          >
            Add Regulation
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {regulations.length === 0 ? (
          <div className="bg-white shadow-md rounded-lg p-12 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No regulations found
            </h2>
            <p className="text-gray-600 mb-6">
              Start monitoring regulations by adding a jurisdiction
            </p>
            <Link
              href="/dashboard"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Jurisdiction
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Effective Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Versions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {regulations.map((regulation) => (
                  <tr
                    key={regulation.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <Link
                        href={`/dashboard/regulations/${regulation.id}`}
                        className="text-blue-600 font-medium hover:underline"
                      >
                        {regulation.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-gray-900">
                      {regulation.jurisdiction?.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 text-gray-900">
                      {regulation.regulationType}
                    </td>
                    <td className="px-6 py-4 text-gray-900">
                      {regulation.effectiveDate
                        ? formatDate(new Date(regulation.effectiveDate))
                        : '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-900 font-semibold">
                      {regulation.versions.length}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/dashboard/regulations/${regulation.id}`}
                        className="text-blue-600 hover:text-blue-700 font-medium"
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
