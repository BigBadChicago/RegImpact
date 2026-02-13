'use client';

import React from 'react';
import type { UpcomingDeadline } from '@/types/dashboard';

interface DeadlineTableProps {
  deadlines: UpcomingDeadline[];
}

/**
 * DeadlineTable component displays upcoming deadlines in a responsive table.
 * 
 * @component
 * @example
 * <DeadlineTable deadlines={dashboardData.upcomingDeadlines} />
 */
export function DeadlineTable({ deadlines }: DeadlineTableProps): React.ReactElement {
  /**
   * Returns color styling based on days remaining
   */
  const getDaysRemainingColor = (daysRemaining: number): string => {
    if (daysRemaining < 30) return 'text-red-600 bg-red-50';
    if (daysRemaining < 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  /**
   * Returns badge styling based on risk level
   */
  const getRiskLevelBadge = (riskLevel: string): React.ReactElement => {
    const baseClasses = 'px-2 py-1 rounded text-xs font-medium';
    
    switch (riskLevel) {
      case 'CRITICAL':
        return <span className={`${baseClasses} bg-red-100 text-red-800`}>Critical</span>;
      case 'IMPORTANT':
        return <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>Important</span>;
      case 'ROUTINE':
        return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>Routine</span>;
      default:
        return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>Unknown</span>;
    }
  };

  /**
   * Formats date string for display
   */
  const formatDate = (dateString: string | Date): string => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  if (deadlines.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-500">No upcoming deadlines</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Regulation
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Deadline Date
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Days Remaining
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Risk Level
              </th>
            </tr>
          </thead>
          <tbody>
            {deadlines.map((deadline) => (
              <tr
                key={deadline.id}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                  {deadline.regulation}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {formatDate(deadline.date)}
                </td>
                <td className={`px-6 py-4 text-sm font-medium ${getDaysRemainingColor(deadline.daysRemaining)}`}>
                  {deadline.daysRemaining} days
                </td>
                <td className="px-6 py-4 text-sm">
                  {getRiskLevelBadge(deadline.riskLevel)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
