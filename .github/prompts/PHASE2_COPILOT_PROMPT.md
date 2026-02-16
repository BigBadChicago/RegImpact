# PHASE 2: Analytics & Intelligence (Months 3-4)

## Overview
Advanced analytics features building on Phase 1 dashboard. Implements predictive analytics, department insights, geographic visualization, and customizable widget system.

**Timeline:** Months 3-4  
**Effort:** 185 hours  
**Files:** 6 files  
**Feature Branch:** `feature/phase2-analytics`

---

## Features to Implement

1. **Department Impact Matrix** - 2D heatmap showing department/regulation-type intersections
2. **Trend Analysis** - 4 predictive charts (velocity, cost, score, forecast)
3. **Geographic Heat Map** - US state-level regulation visualization
4. **Customizable Dashboard Widgets** - Drag-and-drop dashboard builder

---

## Implementation Prompt

```
Implement Phase 2 analytics features for RegImpact. Build on Phase 1 components. Create all files in one pass.

FEATURES TO IMPLEMENT:
1. Department Impact Matrix (2D heatmap)
2. Trend Analysis (4 charts: velocity, cost, score, prediction)
3. Geographic Heat Map (US states)
4. Customizable Dashboard Widgets (drag-and-drop)

FILES TO CREATE:

FILE 1: src/components/dashboard/DepartmentMatrix.tsx
- 2D heatmap using Recharts ScatterChart
- Rows: 6 departments (HR, Finance, Operations, Legal, IT, Sales)
- Columns: 5 regulation types (Employment, Financial, Safety, Data Privacy, Industry-Specific)
- Cell color: Heat scale based on (cost + effort score)
  * Green (#10b981): Low impact (<$10K, <40 hours)
  * Yellow (#f59e0b): Medium impact ($10K-$50K, 40-100 hours)
  * Red (#ef4444): High impact (>$50K, >100 hours)
- Cell size: Proportional to regulation count
- Click cell: Filter main dashboard by department + regulation type
- Tooltip: Show breakdown (count, total cost, avg effort)
- Data source: CostEstimate.departmentBreakdown (existing field)
- Responsive: Scroll on mobile, full grid on desktop

Example implementation:
```tsx
interface MatrixCell {
  department: string;
  regulationType: string;
  impactScore: number; // 0-100
  regulationCount: number;
  totalCost: number;
  totalHours: number;
}

// Calculate impact score
const impactScore = Math.min(100, (totalCost / 1000) + (totalHours / 10));

// Color mapping
const getColor = (score: number) => {
  if (score < 30) return '#10b981';
  if (score < 70) return '#f59e0b';
  return '#ef4444';
};
```

FILE 2: src/components/dashboard/TrendCharts.tsx
- Container component with 4 sub-charts (2x2 grid on desktop, stacked on mobile)
- All use Recharts LineChart

Chart 1: Regulatory Velocity
- X-axis: Last 12 months
- Y-axis: Count of new regulations detected per month
- Line color: Blue (#3b82f6)
- Data calculation: Group regulations by detectedDate month

Chart 2: Cost Trend
- X-axis: Last 12 months
- Y-axis: Total cost exposure (rolling 3-month average)
- Line color: Orange (#f97316)
- Area fill: Gradient from orange to transparent
- Data calculation: Sum costEstimate.estimatedCost per month, apply rolling average

Chart 3: Compliance Score History
- X-axis: Last 6 months
- Y-axis: Health score (0-100)
- Line color: Green (#10b981)
- Reference line: 80 (target threshold)
- Data calculation: Store monthly snapshots of health score (new table: HealthScoreHistory)

Chart 4: Forecast
- X-axis: Next 3 months (future dates)
- Y-axis: Predicted regulation count
- Line style: Dashed
- Confidence band: Light gray area (±20%)
- Algorithm: Simple linear regression y = mx + b
  * Calculate from last 6 months of historical data
  * Slope (m): Average month-over-month change
  * Intercept (b): Current value

Toggle controls:
- Time period: 6m, 1y, 2y
- Metric selector: Cost vs Count vs Score

FILE 3: src/components/dashboard/GeoHeatMap.tsx
- SVG-based US map using @visx/geo
- State coloring: Based on regulation count per state
  * Scale: 0 (white) → max count (dark blue #1e40af)
- Bubble overlay: Circle size represents total cost exposure per state
  * Min radius: 5px, Max radius: 30px
- Hover tooltip:
  * State name
  * Regulation count
  * Total cost exposure
  * Top regulation type
- Click state: Apply filter to dashboard
- Legend: Color scale + size reference
- Data source: Regulation.jurisdiction field (parse state abbreviation)
- Default view: Continental US (exclude AK, HI initially, show in expanded view)

Dependencies:
- npm install @visx/geo @visx/scale @visx/tooltip @visx/group --legacy-peer-deps

Example:
```tsx
import { Mercator, Graticule } from '@visx/geo';
import { scaleQuantize } from '@visx/scale';
import * as topojson from 'topojson-client';

const geoUrl = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';

const colorScale = scaleQuantize({
  domain: [0, maxRegulationCount],
  range: ['#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1e40af']
});
```

FILE 4: src/components/dashboard/WidgetGrid.tsx
- Drag-and-drop layout using react-grid-layout
- Widget catalog:
  1. Health Score Gauge (from Phase 1)
  2. Cost Waterfall (from Phase 1)
  3. Regulatory Timeline (from Phase 1)
  4. Department Matrix (new)
  5. Trend Charts (new)
  6. Geographic Heat Map (new)
  7. Upcoming Deadlines List
  8. Recent Activity Feed
- Layout persistence:
  * Save to User.dashboardLayout column (JSON)
  * Schema: `dashboardLayout Json?` in User model
  * LocalStorage fallback if user not logged in
- Prebuilt templates:
  * CFO View: Cost waterfall, forecast, department matrix
  * COO View: Timeline, geo map, deadlines
  * Compliance Officer: Health score, deadlines, activity
- Controls:
  * "Edit Layout" button → Enable drag mode
  * "Reset to Default" → Restore template
  * "Save Layout" → Persist to database
- Responsive breakpoints:
  * Desktop: 12 columns
  * Tablet: 8 columns
  * Mobile: 4 columns (no drag, vertical stack)

Dependencies:
- npm install react-grid-layout

Example layout structure:
```tsx
const defaultLayout = [
  { i: 'health-score', x: 0, y: 0, w: 3, h: 2 },
  { i: 'cost-waterfall', x: 3, y: 0, w: 5, h: 2 },
  { i: 'timeline', x: 8, y: 0, w: 4, h: 2 },
  { i: 'department-matrix', x: 0, y: 2, w: 6, h: 3 },
  { i: 'trend-charts', x: 6, y: 2, w: 6, h: 3 },
];
```

FILE 5: src/lib/analytics/trends.ts
Export utility functions for trend calculations:

```typescript
export interface VelocityData {
  month: string;
  count: number;
  change: number; // % change vs previous month
}

export async function calculateVelocity(customerId: string, months: number = 12): Promise<VelocityData[]> {
  const startDate = subMonths(new Date(), months);
  const regulations = await prisma.regulation.findMany({
    where: {
      customerId,
      detectedDate: { gte: startDate }
    },
    orderBy: { detectedDate: 'asc' }
  });
  
  // Group by month
  const monthlyGroups = regulations.reduce((acc, reg) => {
    const monthKey = format(reg.detectedDate, 'yyyy-MM');
    acc[monthKey] = (acc[monthKey] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Convert to array with change calculation
  const months = Object.keys(monthlyGroups).sort();
  return months.map((month, idx) => ({
    month,
    count: monthlyGroups[month],
    change: idx > 0 ? ((monthlyGroups[month] - monthlyGroups[months[idx-1]]) / monthlyGroups[months[idx-1]]) * 100 : 0
  }));
}

export interface CostTrendData {
  month: string;
  totalCost: number;
  rollingAverage: number;
}

export async function calculateCostTrend(customerId: string, months: number = 12): Promise<CostTrendData[]> {
  const startDate = subMonths(new Date(), months);
  const estimates = await prisma.costEstimate.findMany({
    where: {
      regulation: { customerId },
      createdAt: { gte: startDate }
    },
    orderBy: { createdAt: 'asc' }
  });
  
  // Group by month
  const monthlyCosts = estimates.reduce((acc, est) => {
    const monthKey = format(est.createdAt, 'yyyy-MM');
    acc[monthKey] = (acc[monthKey] || 0) + est.estimatedCost;
    return acc;
  }, {} as Record<string, number>);
  
  // Calculate rolling 3-month average
  const sortedMonths = Object.keys(monthlyCosts).sort();
  return sortedMonths.map((month, idx) => {
    const window = sortedMonths.slice(Math.max(0, idx - 2), idx + 1);
    const rollingAverage = window.reduce((sum, m) => sum + monthlyCosts[m], 0) / window.length;
    return {
      month,
      totalCost: monthlyCosts[month],
      rollingAverage
    };
  });
}

export interface ForecastResult {
  predictions: Array<{ month: string; predicted: number; confidence: number }>;
  model: { slope: number; intercept: number; r2: number };
}

export function forecastRegulations(historical: VelocityData[]): ForecastResult {
  // Simple linear regression
  const n = historical.length;
  const x = historical.map((_, i) => i); // Month indices
  const y = historical.map(d => d.count);
  
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // R-squared for confidence
  const yMean = sumY / n;
  const ssTotal = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
  const ssResidual = y.reduce((sum, yi, i) => sum + Math.pow(yi - (slope * x[i] + intercept), 2), 0);
  const r2 = 1 - (ssResidual / ssTotal);
  
  // Predict next 3 months
  const predictions = [1, 2, 3].map(futureOffset => {
    const xValue = n + futureOffset - 1;
    const predicted = Math.max(0, Math.round(slope * xValue + intercept));
    return {
      month: format(addMonths(new Date(), futureOffset), 'yyyy-MM'),
      predicted,
      confidence: Math.round(r2 * 100)
    };
  });
  
  return { predictions, model: { slope, intercept, r2 } };
}
```

FILE 6: src/app/api/analytics/route.ts
```typescript
import { NextRequest } from 'next/server';
import { calculateVelocity, calculateCostTrend, forecastRegulations } from '@/lib/analytics/trends';
import { calculateHealthScore, computeHealthScore } from '@/lib/dashboard/metrics';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get('customerId');
  const period = parseInt(searchParams.get('period') || '12', 10); // months
  
  if (!customerId) {
    return Response.json({ error: 'Missing customerId' }, { status: 400 });
  }
  
  try {
    // Parallel fetch all analytics
    const [velocity, costTrend, currentHealth] = await Promise.all([
      calculateVelocity(customerId, period),
      calculateCostTrend(customerId, period),
      calculateHealthScore(customerId)
    ]);
    
    const forecast = forecastRegulations(velocity);
    const healthScore = computeHealthScore(currentHealth);
    
    // Fetch historical health scores (if exists)
    const scoreHistory = await prisma.healthScoreHistory.findMany({
      where: { customerId },
      orderBy: { recordedAt: 'asc' },
      take: period
    });
    
    return Response.json({
      velocity,
      costTrend,
      forecast,
      healthScore: {
        current: healthScore,
        history: scoreHistory.map(h => ({ month: format(h.recordedAt, 'yyyy-MM'), score: h.score }))
      }
    });
  } catch (error) {
    console.error('Analytics API error:', error);
    return Response.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
```

DEPENDENCIES:
npm install react-grid-layout @visx/geo @visx/scale @visx/tooltip @visx/group date-fns --legacy-peer-deps

PRISMA SCHEMA ADDITIONS:
```prisma
model User {
  // ... existing fields
  dashboardLayout Json?  // Stores widget positions
}

model HealthScoreHistory {
  id String @id @default(cuid())
  customerId String
  score Int
  recordedAt DateTime @default(now())
  customer Customer @relation(fields: [customerId], references: [id])
  
  @@index([customerId, recordedAt])
}
```

TESTING:
□ Matrix cells clickable and filter works
□ Trend charts show accurate historical data
□ Forecast within 20% of actual (test with historical data)
□ Geo map renders all 50 states correctly
□ Widget drag-and-drop persists on page refresh
□ Layout templates load correctly
□ Page load still <2s with all widgets
□ Mobile responsiveness maintained

EFFORT: 185 hours
```

---

## Acceptance Criteria

- [ ] Department matrix displays all department/type combinations
- [ ] Trend analysis shows 12 months of historical data
- [ ] Forecast predictions have >70% confidence
- [ ] Geographic map displays all 50 US states
- [ ] Widget drag-and-drop saves to database
- [ ] All charts are responsive
- [ ] Performance: Dashboard loads in <2s with all widgets
- [ ] No TypeScript errors

---

## Dependencies

```json
{
  "react-grid-layout": "^1.4.4",
  "@visx/geo": "^3.12.0",
  "@visx/scale": "^3.5.0",
  "@visx/tooltip": "^3.3.0",
  "@visx/group": "^3.3.0",
  "date-fns": "^4.1.0"
}
```

---

## Database Migrations

Run after creating files:
```bash
npx prisma migrate dev --name add-analytics-models
```

---

## Related Files

- Phase 1 components: `src/components/dashboard/HealthScoreGauge.tsx`, etc.
- Architecture reference: `COPILOT_CONTEXT.md`
- Main plan: `plan-executiveDashboardEnhancements.prompt.md`
