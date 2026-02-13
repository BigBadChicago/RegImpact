'use client';

/**
 * DiffComparison Component
 * Handles version selection and diff generation for a regulation
 */

import { useState, ReactNode } from 'react';
import VersionSelector from './VersionSelector';
import DiffViewer from './DiffViewer';
import { SignificanceScore, PolicyDiffSummary } from '@/types/policydiff';

interface Version {
  id: string;
  versionNumber: number;
  publishedDate?: Date | string;
  contentText?: string;
}

interface DiffComparisonProps {
  regulationId: string;
  versions: Version[];
}

interface DiffResponse extends PolicyDiffSummary {
  id: string;
  diffText: string;
  significanceScore: SignificanceScore;
}

export default function DiffComparison({
  regulationId,
  versions,
}: DiffComparisonProps) {
  const [diff, setDiff] = useState<DiffResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCompare = async (previousId: string, currentId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/regulations/${regulationId}/diff`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            previousVersionId: previousId,
            currentVersionId: currentId,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate diff');
      }

      const data = (await response.json()) as DiffResponse;
      setDiff(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error generating diff:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Version Selector */}
      <VersionSelector
        versions={versions}
        onCompare={handleCompare}
        isLoading={isLoading}
      />

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">Error</p>
          <p className="text-red-700 text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
          <p className="text-blue-900 font-medium">Generating diff...</p>
          <p className="text-blue-700 text-sm mt-1">
            This may take a few seconds while AI analyzes the changes
          </p>
        </div>
      )}

      {/* Diff Viewer */}
      {diff && !isLoading && (
        <DiffViewer
          diffText={diff.diffText}
          summary={diff.summary}
          keyChanges={diff.keyChanges}
          significanceScore={diff.significanceScore}
          confidence={diff.aiConfidence}
        />
      )}

      {/* Empty State */}
      {!diff && !isLoading && !error && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600">
            Select two versions above to compare and analyze changes
          </p>
        </div>
      )}
    </div>
  );
}
