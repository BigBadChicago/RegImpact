'use client';

import React from 'react';
import type { MetricCardProps } from '@/types/dashboard';

/**
 * Simple trend indicators using text and emojis
 */
const TrendingUpIcon = () => <span className="text-red-600 text-lg">▲</span>;
const TrendingDownIcon = () => <span className="text-green-600 text-lg">▼</span>;
const NeutralIcon = () => <span className="text-gray-400 text-lg">—</span>;

/**
 * MetricCard component displays a single metric with value, trend, and icon.
 * 
 * @component
 * @example
 * <MetricCard 
 *   title="Total Exposure" 
 *   value="$350,000"
 *   trend="up"
 *   icon={<DollarSign />}
 *   subtitle="Overall regulatory exposure"
 * />
 */
export function MetricCard({
  title,
  value,
  trend,
  icon,
  subtitle,
}: MetricCardProps): React.ReactElement {
  /**
   * Returns the appropriate trend indicator component
   */
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUpIcon />;
      case 'down':
        return <TrendingDownIcon />;
      case 'neutral':
        return <NeutralIcon />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
      {/* Header with icon and trend */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm text-gray-600 font-medium">{title}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        {icon && <div className="text-blue-600">{icon}</div>}
      </div>

      {/* Value and trend indicator */}
      <div className="flex items-end justify-between">
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        {trend && <div className="flex-shrink-0">{getTrendIcon()}</div>}
      </div>
    </div>
  );
}
