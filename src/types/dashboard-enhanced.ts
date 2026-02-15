export interface ComplianceHealthScore {
  score: number  // 0-100
  components: {
    deadlineAdherence: number  // 0-100
    costPredictability: number  // 0-100
    riskExposureInverse: number  // 0-100
  }
  trend: Array<{ month: string; score: number }>  // 3-month history
  industryBenchmark?: number  // Optional peer comparison
}

export interface CostWaterfallData {
  starting: number  // Current total exposure
  additions: Array<{ name: string; value: number; regulationId: string }>
  reductions: Array<{ name: string; value: number; regulationId: string }>
  ending: number  // Projected exposure
}

export interface TimelineRegulation {
  id: string
  title: string
  deadline: Date
  cost: number
  riskLevel: 'CRITICAL' | 'IMPORTANT' | 'ROUTINE'
  department: string
  jurisdiction: string
}

export interface EnhancedDashboardData {
  healthScore: ComplianceHealthScore
  costWaterfall: CostWaterfallData
  timelineRegulations: TimelineRegulation[]
}
