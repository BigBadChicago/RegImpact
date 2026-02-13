/**
 * Text Diffing Utilities
 * Uses diff library to compare regulation versions
 */

import { diffLines } from 'diff';
import {
  DiffResult,
  ChangeSections,
  ChangeMetrics,
} from '@/types/policydiff';

/**
 * Generate text diff between two regulation versions
 * @param oldText - Previous version text
 * @param newText - Current version text
 * @returns DiffResult with categorized changes
 */
export function generateTextDiff(oldText: string, newText: string): DiffResult {
  if (!oldText || !newText) {
    return {
      added: newText ? newText.split('\n').filter((l) => l.trim()) : [],
      removed: oldText ? oldText.split('\n').filter((l) => l.trim()) : [],
      modified: [],
      unchanged: [],
    };
  }

  if (oldText === newText) {
    return {
      added: [],
      removed: [],
      modified: [],
      unchanged: oldText.split('\n'),
    };
  }

  const diffs = diffLines(oldText, newText, { ignoreWhitespace: false });

  const result: DiffResult = {
    added: [],
    removed: [],
    modified: [],
    unchanged: [],
  };

  diffs.forEach((diff) => {
    const lines = diff.value.split('\n').filter((line) => line.trim());

    if (diff.added) {
      result.added.push(...lines);
    } else if (diff.removed) {
      result.removed.push(...lines);
    } else {
      result.unchanged.push(...lines);
    }
  });

  return result;
}

/**
 * Extract sections with substantial changes
 * @param diffResult - Result from generateTextDiff
 * @returns ChangeSections with filtered, significant changes
 */
export function extractChangedSections(diffResult: DiffResult): ChangeSections {
  // Filter sections that are non-trivial (>3 lines or >100 chars)
  const filterSections = (sections: string[]): string[] => {
    return sections
      .filter((section) => {
        const trimmed = section.trim();
        return trimmed.length > 100 || trimmed.split(' ').length > 10;
      })
      .slice(0, 10); // Limit to 10 sections per category
  };

  return {
    addedSections: filterSections(diffResult.added),
    removedSections: filterSections(diffResult.removed),
    modifiedSections: filterSections(
      [...diffResult.added, ...diffResult.removed]
        .filter((s) => s.trim().length > 0)
        .slice(0, 5)
    ),
  };
}

/**
 * Calculate metrics about the changes
 * @param diffResult - Result from generateTextDiff
 * @returns ChangeMetrics with statistics
 */
export function calculateChangeMetrics(diffResult: DiffResult): ChangeMetrics {
  const linesAdded = diffResult.added.length;
  const linesRemoved = diffResult.removed.length;
  const totalLines = linesAdded + linesRemoved + diffResult.unchanged.length;

  const percentageChanged =
    totalLines > 0
      ? ((linesAdded + linesRemoved) / totalLines) * 100
      : 0;

  return {
    linesAdded,
    linesRemoved,
    percentageChanged: Math.round(percentageChanged * 10) / 10,
    totalLines,
  };
}

/**
 * Format diff in unified diff format for UI display
 * @param diffResult - Result from generateTextDiff
 * @returns Formatted diff string with +/- prefixes
 */
export function formatDiffForDisplay(diffResult: DiffResult): string {
  const lines: string[] = [];

  // Add removed lines
  diffResult.removed.forEach((line) => {
    lines.push(`- ${line}`);
  });

  // Add added lines
  diffResult.added.forEach((line) => {
    lines.push(`+ ${line}`);
  });

  // Add unchanged lines (subset for context)
  diffResult.unchanged.slice(0, 20).forEach((line) => {
    lines.push(`  ${line}`);
  });

  return lines.join('\n');
}
