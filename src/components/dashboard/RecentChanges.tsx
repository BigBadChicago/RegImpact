'use client';

import React from 'react';
import Link from 'next/link';
import type { RecentChange } from '@/types/dashboard';

interface RecentChangesProps {
  changes: RecentChange[];
}

/**
 * RecentChanges component displays a list of recent regulatory changes.
 * 
 * @component
 * @example
 * <RecentChanges changes={dashboardData.recentChanges} />
 */
export function RecentChanges({ changes }: RecentChangesProps): React.ReactElement {
  /**
   * Returns badge styling based on significance score
   */
  const getSignificanceBadge = (significance: string): React.ReactElement => {
    const baseClasses = 'px-2 py-1 rounded text-xs font-medium';
    
    switch (significance) {
      case 'HIGH':
        return <span className={`${baseClasses} bg-red-100 text-red-800`}>High</span>;
      case 'MEDIUM':
        return <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>Medium</span>;
      case 'LOW':
        return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>Low</span>;
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

  if (changes.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-500">No recent changes</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="divide-y divide-gray-100">
        {changes.slice(0, 5).map((change) => (
          <div
            key={change.id}
            className="p-6 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  {change.regulation}
                </h3>
                <p className="text-xs text-gray-500 mt-1">{change.jurisdiction}</p>
              </div>
              {getSignificanceBadge(change.significanceScore)}
            </div>
            
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">{formatDate(change.date)}</p>
              <Link
                href={`/dashboard/regulations/${change.id}`}
                className="inline-flex items-center text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                View Details →
              </Link>
            </div>
          </div>
        ))}
      </div>

      {changes.length > 5 && (
        <div className="border-t border-gray-100 p-4 bg-gray-50">
          <Link
            href="/dashboard/changes"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View All Changes →
          </Link>
        </div>
      )}
    </div>
  );
}
