# PHASE 1: MVP Enhancements (Months 1-2)

## Overview
Foundation layer for RegImpact Executive Dashboard. Implements 3 core visualizations and PDF export functionality.

**Timeline:** Months 1-2  
**Effort:** 220 hours  
**Files:** 8 files  
**Feature Branch:** `feature/phase1-dashboard-mvp`

---

## Features to Implement

1. **Compliance Health Score Gauge** - Circular gauge with 0-100 scoring
2. **Cost Exposure Waterfall Chart** - Visual cost movement tracking
3. **Regulatory Timeline View** - Chronological deadline visualization
4. **PDF Export** - Print-ready dashboard reports

---

## Implementation Prompt

```
Implement Phase 1 MVP dashboard enhancements for RegImpact. Build on existing Next.js/Prisma architecture. Create all files in one pass.

FEATURES TO IMPLEMENT:
1. Health Score Gauge (circular 0-100)
2. Cost Waterfall Chart (exposure changes)
3. Timeline View (regulations over time)
4. PDF Export (basic report)

FILES TO CREATE:

FILE 1: src/types/dashboard.ts
export interface DashboardMetrics {
  healthScore: number;
  healthTrend: number; // % change vs last period
  totalCostExposure: number;
  costTrend: number;
  regulationCount: number;
  upcomingDeadlines: number;
}

export interface HealthScoreComponents {
  deadlineAdherence: number; // 0-100
  costPredictability: number; // 0-100
  riskExposure: number; // 0-100
  weights: {
    deadlineAdherence: 0.4,
    costPredictability: 0.4,
    riskExposure: 0.2
  };
}

export interface WaterfallDataPoint {
  label: string;
  value: number;
  type: 'start' | 'increase' | 'decrease' | 'end';
  color: string;
}

export interface TimelineEvent {
  date: Date;
  regulation: Regulation;
  type: 'effective' | 'compliance' | 'filing';
  status: 'upcoming' | 'due-soon' | 'overdue';
}

FILE 2: src/components/dashboard/HealthScoreGauge.tsx
- Use Recharts RadialBarChart component
- Props: score (0-100), trend (%), components (HealthScoreComponents)
- Color zones: <60 red, 60-80 yellow, 80+ green
- Center text: Large score number + small trend indicator
- Tooltip: Show component breakdown on hover
- Animation: Smooth fill on mount (2s duration)
- Responsive: min-height 250px

FILE 3: src/components/dashboard/CostWaterfall.tsx
- Use Recharts BarChart with custom bar component
- Data structure: Starting balance → increments/decrements → ending balance
- Bars:
  * Start/End: Blue (#3b82f6)
  * Increases: Red (#ef4444)
  * Decreases: Green (#10b981)
- Labels: Dollar amounts above each bar
- X-axis: Category labels (rotate 45° if needed)
- Tooltip: Show regulation details on hover
- Responsive: Horizontal scroll on mobile

FILE 4: src/components/dashboard/RegulatoryTimeline.tsx
- Use Recharts LineChart with scatter overlay
- X-axis: Timeline (months)
- Y-axis: Regulation count
- Data points: Individual regulations as dots
- Color by status: Green (compliant), Yellow (due soon), Red (overdue)
- Click event: Open regulation detail modal
- Range selector: 3m, 6m, 1y, All
- Responsive: Stack legend below chart on mobile

FILE 5: src/lib/dashboard/metrics.ts
export async function calculateHealthScore(customerId: string): Promise<HealthScoreComponents> {
  const regulations = await prisma.regulation.findMany({ where: { customerId } });
  const deadlines = await prisma.deadline.findMany({ where: { regulation: { customerId } } });
  const estimates = await prisma.costEstimate.findMany({ where: { regulation: { customerId } } });
  
  // Deadline adherence: % on-time completions
  const completedOnTime = deadlines.filter(d => d.status === 'COMPLETED' && d.completedAt <= d.dueDate).length;
  const deadlineAdherence = (completedOnTime / deadlines.length) * 100 || 0;
  
  // Cost predictability: 1 - avg(|actual - estimate| / estimate)
  const withActuals = estimates.filter(e => e.actualCost);
  const variance = withActuals.reduce((sum, e) => sum + Math.abs(e.actualCost - e.estimatedCost) / e.estimatedCost, 0);
  const costPredictability = (1 - variance / withActuals.length) * 100 || 100;
  
  // Risk exposure: Inverse of high-risk count
  const highRisk = regulations.filter(r => r.priority === 'CRITICAL' && r.status !== 'COMPLIANT').length;
  const riskExposure = Math.max(0, 100 - (highRisk * 10));
  
  return {
    deadlineAdherence,
    costPredictability,
    riskExposure,
    weights: { deadlineAdherence: 0.4, costPredictability: 0.4, riskExposure: 0.2 }
  };
}

export function computeHealthScore(components: HealthScoreComponents): number {
  const { deadlineAdherence, costPredictability, riskExposure, weights } = components;
  return Math.round(
    deadlineAdherence * weights.deadlineAdherence +
    costPredictability * weights.costPredictability +
    riskExposure * weights.riskExposure
  );
}

FILE 6: src/lib/export/pdf-export.ts
- Use jsPDF library
- generateDashboardPDF(customerId: string): Promise<Blob>
- Pages:
  1. Cover: Company name, date, health score
  2. Metrics Summary: Key numbers, trends
  3. Charts: Waterfall, timeline (convert to images via html2canvas)
  4. Regulation List: Table of all active regulations
- Styling: Professional (blue/white theme)
- Headers/footers: Logo, page numbers
- Returns: PDF blob for download

FILE 7: src/app/api/dashboard/metrics/route.ts
import { calculateHealthScore, computeHealthScore } from '@/lib/dashboard/metrics';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get('customerId');
  
  const components = await calculateHealthScore(customerId);
  const healthScore = computeHealthScore(components);
  
  // Calculate other metrics...
  const metrics: DashboardMetrics = {
    healthScore,
    healthTrend: 5.2, // TODO: Calculate from historical
    totalCostExposure: 1250000,
    costTrend: -3.1,
    regulationCount: 47,
    upcomingDeadlines: 12
  };
  
  return Response.json({ metrics, components });
}

FILE 8: src/app/dashboard/executive/page.tsx
- Server component
- Fetch metrics from API
- Layout: 4-column grid
  * Row 1: 4 metric cards (health, cost, regs, deadlines)
  * Row 2: Health gauge (col 1-2), Cost waterfall (col 3-4)
  * Row 3: Timeline (full width)
- Export button: PDF download
- Refresh button: Revalidate data
- Time period selector: This month, quarter, year

DEPENDENCIES:
npm install recharts jspdf html2canvas @types/react date-fns

TESTING:
□ Health score calculates correctly
□ Waterfall shows proper cost flow
□ Timeline is interactive and zoomable
□ PDF exports with all charts
□ Responsive on mobile/tablet
□ Page load time <2s

EFFORT: 220 hours
```

---

## Acceptance Criteria

- [ ] Dashboard loads in <2 seconds
- [ ] Health score matches manual calculation
- [ ] All charts are responsive (mobile, tablet, desktop)
- [ ] PDF export includes all visualizations
- [ ] No console errors
- [ ] TypeScript types are complete
- [ ] Pass all unit tests

---

## Dependencies

```json
{
  "recharts": "^2.10.0",
  "jspdf": "^2.5.1",
  "html2canvas": "^1.4.1",
  "date-fns": "^3.0.0"
}
```

---

## Related Files

- Architecture reference: `COPILOT_CONTEXT.md`
- Main plan: `plan-executiveDashboardEnhancements.prompt.md`
- Database schema: `prisma/schema.prisma`
