'use client';

/**
 * SignificanceBadge Component
 * Displays significance level with color coding
 */

import { SignificanceScore } from '@/types/policydiff';

interface SignificanceBadgeProps {
  score: SignificanceScore;
  size?: 'sm' | 'md' | 'lg';
}

export default function SignificanceBadge({
  score,
  size = 'md',
}: SignificanceBadgeProps) {
  // Determine styling based on score and size
  let bgColor = 'bg-gray-100';
  let textColor = 'text-gray-800';
  let borderColor = 'border-gray-300';
  let label = 'Low Impact';

  if (score === SignificanceScore.HIGH) {
    bgColor = 'bg-red-100';
    textColor = 'text-red-800';
    borderColor = 'border-red-300';
    label = 'High Impact';
  } else if (score === SignificanceScore.MEDIUM) {
    bgColor = 'bg-yellow-100';
    textColor = 'text-yellow-800';
    borderColor = 'border-yellow-300';
    label = 'Medium Impact';
  }

  // Size variants
  let sizeClasses = 'px-3 py-1.5 text-sm';
  if (size === 'sm') {
    sizeClasses = 'px-2 py-1 text-xs';
  } else if (size === 'lg') {
    sizeClasses = 'px-4 py-2 text-base';
  }

  return (
    <span
      className={`${bgColor} ${textColor} ${borderColor} ${sizeClasses} rounded-full font-semibold border inline-block whitespace-nowrap`}
    >
      {label}
    </span>
  );
}
