import { ReactNode } from 'react';

/**
 * Dashboard metric data type
 */
export type RiskLevel = 'CRITICAL' | 'IMPORTANT' | 'ROUTINE';
export type Significance = 'HIGH' | 'MEDIUM' | 'LOW';
export type Trend = 'up' | 'down' | 'neutral';

/**
 * Individual upcoming deadline
 */
export interface UpcomingDeadline {
  id: string;
  regulation: string;
  date: Date | string;
  daysRemaining: number;
  riskLevel: RiskLevel;
}

/**
 * Individual recent change entry
 */
export interface RecentChange {
  id: string;
  regulation: string;
  jurisdiction: string;
  significanceScore: Significance;
  date: Date | string;
}

/**
 * Complete dashboard data structure
 */
export interface DashboardData {
  totalExposure: number;
  regulationCount: number;
  criticalDeadlines: number;
  highRiskChanges: number;
  upcomingDeadlines: UpcomingDeadline[];
  recentChanges: RecentChange[];
}

/**
 * Props for metric card component
 */
export interface MetricCardProps {
  title: string;
  value: string | number;
  trend?: Trend;
  icon?: ReactNode;
  subtitle?: string;
}
