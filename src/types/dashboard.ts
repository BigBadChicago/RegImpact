export interface DashboardMetrics {
  healthScore: number
  healthTrend: number // % change vs last period
  totalCostExposure: number
  costTrend: number
  regulationCount: number
  upcomingDeadlines: number
}

export interface HealthScoreComponents {
  deadlineAdherence: number // 0-100
  costPredictability: number // 0-100
  riskExposure: number // 0-100
  weights: {
    deadlineAdherence: number
    costPredictability: number
    riskExposure: number
  }
}

export interface WaterfallDataPoint {
  label: string
  value: number
  type: 'start' | 'increase' | 'decrease' | 'end'
  color: string
}

export interface TimelineEvent {
  date: Date
  regulation: {
    id: string
    title: string
  }
  type: 'effective' | 'compliance' | 'filing'
  status: 'upcoming' | 'due-soon' | 'overdue'
}
