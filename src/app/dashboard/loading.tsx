import React from 'react';

/**
 * Loading skeleton for dashboard page
 * Displays animated placeholder content while dashboard data is loading
 */
export default function DashboardLoading(): React.ReactElement {
  return (
    <div className="space-y-6">
      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
              <div className="w-6 h-6 bg-gray-200 rounded" />
            </div>
            <div className="h-8 bg-gray-200 rounded w-2/3" />
          </div>
        ))}
      </div>

      {/* Two-Column Layout Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deadlines Table Skeleton */}
        <div className="lg:col-span-2">
          <div className="mb-4">
            <div className="h-6 bg-gray-200 rounded w-1/3 animate-pulse" />
            <div className="h-4 bg-gray-100 rounded w-1/2 mt-2 animate-pulse" />
          </div>
          <div className="bg-white rounded-lg shadow overflow-hidden animate-pulse">
            {/* Table header skeleton */}
            <div className="bg-gray-50 p-6 border-b border-gray-200 flex gap-6">
              <div className="h-4 bg-gray-200 rounded w-1/4" />
              <div className="h-4 bg-gray-200 rounded w-1/4" />
              <div className="h-4 bg-gray-200 rounded w-1/4" />
              <div className="h-4 bg-gray-200 rounded w-1/4" />
            </div>

            {/* Table rows skeleton */}
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-6 border-b border-gray-100 flex gap-6">
                <div className="h-4 bg-gray-200 rounded w-1/4" />
                <div className="h-4 bg-gray-200 rounded w-1/4" />
                <div className="h-4 bg-gray-200 rounded w-1/4" />
                <div className="h-4 bg-gray-200 rounded w-1/4" />
              </div>
            ))}
          </div>
        </div>

        {/* Recent Changes Skeleton */}
        <div className="lg:col-span-1">
          <div className="mb-4">
            <div className="h-6 bg-gray-200 rounded w-1/3 animate-pulse" />
            <div className="h-4 bg-gray-100 rounded w-1/2 mt-2 animate-pulse" />
          </div>
          <div className="bg-white rounded-lg shadow overflow-hidden animate-pulse">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-6 border-b border-gray-100">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                  <div className="h-6 bg-gray-200 rounded w-16" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="h-3 bg-gray-100 rounded w-1/4" />
                  <div className="h-3 bg-gray-200 rounded w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
