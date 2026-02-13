'use client';

/**
 * DiffViewer Component
 * Side-by-side or unified diff viewer for regulation changes
 * Shows executive summary, key changes, and detailed diff
 */

import { useState } from 'react';
import { SignificanceScore } from '@/types/policydiff';
import SignificanceBadge from './SignificanceBadge';

interface DiffViewerProps {
  diffText: string;
  summary: string;
  keyChanges: string[];
  significanceScore: SignificanceScore;
  confidence: number;
}

type ViewMode = 'split' | 'unified';

export default function DiffViewer({
  diffText,
  summary,
  keyChanges,
  significanceScore,
  confidence,
}: DiffViewerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('split');

  // Parse diff text into individual lines
  const diffLines = diffText.split('\n').filter((line) => line.length > 0);
  const removedLines = diffLines.filter((line) => line.startsWith('- '));
  const addedLines = diffLines.filter((line) => line.startsWith('+ '));
  const unchangedLines = diffLines.filter((line) => !line.startsWith('-') && !line.startsWith('+'));

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4">
      {/* Executive Summary Card */}
      <div className="bg-white shadow-md rounded-lg p-6 border-l-4 border-blue-600">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Executive Summary
          </h2>
          <SignificanceBadge score={significanceScore} size="md" />
        </div>
        
        <p className="text-gray-700 text-base leading-relaxed mb-4">
          {summary}
        </p>

        {/* Confidence Indicator */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            Analysis Confidence:
          </span>
          <div className="flex-1 max-w-xs bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${confidence * 100}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-gray-700">
            {Math.round(confidence * 100)}%
          </span>
        </div>
      </div>

      {/* Key Changes Section */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Key Changes
        </h3>
        <div className="space-y-3">
          {keyChanges.length > 0 ? (
            keyChanges.map((change, idx) => (
              <div
                key={idx}
                className="flex gap-3 p-3 bg-gray-50 rounded-md border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <span className="text-blue-600 font-bold flex-shrink-0">•</span>
                <p className="text-gray-700">{change}</p>
              </div>
            ))
          ) : (
            <p className="text-gray-500 italic">No key changes identified</p>
          )}
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode('split')}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            viewMode === 'split'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
          }`}
        >
          Split View
        </button>
        <button
          onClick={() => setViewMode('unified')}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            viewMode === 'unified'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
          }`}
        >
          Unified View
        </button>
      </div>

      {/* Diff Viewer */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
        {viewMode === 'split' ? (
          <SplitView removedLines={removedLines} addedLines={addedLines} />
        ) : (
          <UnifiedView diffLines={diffLines} />
        )}
      </div>
    </div>
  );
}

/**
 * Split View Component
 * Shows removed lines on left, added on right
 */
function SplitView({
  removedLines,
  addedLines,
}: {
  removedLines: string[];
  addedLines: string[];
}) {
  const maxLines = Math.max(removedLines.length, addedLines.length);

  return (
    <div className="overflow-x-auto max-h-96 md:max-h-full">
      <div className="flex">
        {/* Previous Version Column */}
        <div className="flex-1 border-r border-gray-200">
          <div className="bg-red-50 px-4 py-2 font-semibold text-red-900 border-b border-gray-200">
            Previous Version
          </div>
          <div className="font-mono text-sm space-y-0">
            {removedLines.slice(0, 50).map((line, idx) => (
              <div
                key={idx}
                className="bg-red-50 text-red-800 px-4 py-1 border-b border-red-200 hover:bg-red-100"
              >
                <span className="text-red-600 font-bold">- </span>
                {line.substring(2)}
              </div>
            ))}
            {removedLines.length === 0 && (
              <div className="px-4 py-8 text-gray-400 text-center italic">
                No changes
              </div>
            )}
          </div>
        </div>

        {/* Current Version Column */}
        <div className="flex-1">
          <div className="bg-green-50 px-4 py-2 font-semibold text-green-900 border-b border-gray-200">
            Current Version
          </div>
          <div className="font-mono text-sm space-y-0">
            {addedLines.slice(0, 50).map((line, idx) => (
              <div
                key={idx}
                className="bg-green-50 text-green-800 px-4 py-1 border-b border-green-200 hover:bg-green-100"
              >
                <span className="text-green-600 font-bold">+ </span>
                {line.substring(2)}
              </div>
            ))}
            {addedLines.length === 0 && (
              <div className="px-4 py-8 text-gray-400 text-center italic">
                No changes
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Unified View Component
 * Shows all lines in single column with +/- prefixes
 */
function UnifiedView({ diffLines }: { diffLines: string[] }) {
  return (
    <div className="overflow-x-auto max-h-96 md:max-h-full">
      <div className="font-mono text-sm">
        {diffLines.slice(0, 100).map((line, idx) => {
          let bgColor = 'bg-gray-50';
          let textColor = 'text-gray-800';

          if (line.startsWith('- ')) {
            bgColor = 'bg-red-50';
            textColor = 'text-red-800';
          } else if (line.startsWith('+ ')) {
            bgColor = 'bg-green-50';
            textColor = 'text-green-800';
          }

          return (
            <div
              key={idx}
              className={`${bgColor} ${textColor} px-4 py-1 border-b border-gray-200 hover:opacity-75`}
            >
              {line}
            </div>
          );
        })}
      </div>
      {diffLines.length > 100 && (
        <div className="px-4 py-2 text-gray-500 text-xs text-center italic">
          Showing first 100 lines of {diffLines.length} (truncated for performance)
        </div>
      )}
    </div>
  );
}
