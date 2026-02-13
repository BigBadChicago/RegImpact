'use client';

import React, { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Error boundary component for dashboard page
 * Displays user-friendly error message with recovery options
 */
export default function DashboardError({ error, reset }: ErrorProps): React.ReactElement {
  useEffect(() => {
    // Log error details for debugging
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        {/* Error icon */}
        <div className="flex justify-center mb-4">
          <div className="bg-red-100 rounded-full p-3">
            <span className="text-3xl">⚠️</span>
          </div>
        </div>

        {/* Error message */}
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
          Oops! Something went wrong
        </h1>
        
        <p className="text-gray-600 text-center mb-6">
          The dashboard encountered an unexpected error. This has been logged and our team has been notified.
        </p>

        {/* Error details (development only) */}
        {process.env.NODE_ENV === 'development' && error.message && (
          <div className="bg-red-50 border border-red-200 rounded p-3 mb-6">
            <p className="text-sm text-red-800 font-mono break-words">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs text-red-700 mt-2">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-3">
          <button
            onClick={reset}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Try Again
          </button>
          
          <a
            href="/dashboard"
            className="block w-full px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors font-medium text-center"
          >
            Return to Dashboard
          </a>
        </div>

        {/* Support message */}
        <p className="text-xs text-gray-500 text-center mt-4">
          If this problem persists, please contact support at support@regimpact.com
        </p>
      </div>
    </div>
  );
}
