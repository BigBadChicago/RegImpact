'use client';

/**
 * VersionSelector Component
 * Allows users to select two regulation versions for comparison
 */

import { useState } from 'react';

interface Version {
  id: string;
  versionNumber: number;
  publishedDate?: Date | string;
}

interface VersionSelectorProps {
  versions: Version[];
  onCompare: (previousId: string, currentId: string) => void;
  isLoading?: boolean;
}

export default function VersionSelector({
  versions,
  onCompare,
  isLoading = false,
}: VersionSelectorProps) {
  const [selectedPrevious, setSelectedPrevious] = useState<string | null>(null);
  const [selectedCurrent, setSelectedCurrent] = useState<string | null>(null);

  const handleCompare = () => {
    if (selectedPrevious && selectedCurrent && selectedPrevious !== selectedCurrent) {
      onCompare(selectedPrevious, selectedCurrent);
    }
  };

  const isValid =
    selectedPrevious &&
    selectedCurrent &&
    selectedPrevious !== selectedCurrent &&
    !isLoading;

  const formatDate = (date?: Date | string): string => {
    if (!date) return 'Unknown';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(dateObj);
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Compare Versions
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Previous Version Dropdown */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Previous Version
          </label>
          <select
            value={selectedPrevious || ''}
            onChange={(e) => setSelectedPrevious(e.target.value)}
            disabled={isLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">Select a version...</option>
            {versions.map((version) => (
              <option key={version.id} value={version.id}>
                Version {version.versionNumber} ({formatDate(version.publishedDate)})
              </option>
            ))}
          </select>
        </div>

        {/* Current Version Dropdown */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Current Version
          </label>
          <select
            value={selectedCurrent || ''}
            onChange={(e) => setSelectedCurrent(e.target.value)}
            disabled={isLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">Select a version...</option>
            {versions.map((version) => (
              <option key={version.id} value={version.id}>
                Version {version.versionNumber} ({formatDate(version.publishedDate)})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Validation Message */}
      {selectedPrevious === selectedCurrent && selectedPrevious && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            Please select different versions to compare
          </p>
        </div>
      )}

      {/* Compare Button */}
      <button
        onClick={handleCompare}
        disabled={!isValid}
        className={`w-full md:w-auto px-6 py-2 rounded-md font-semibold transition-colors ${
          isValid
            ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        {isLoading ? 'Generating Diff...' : 'Compare Versions'}
      </button>
    </div>
  );
}
