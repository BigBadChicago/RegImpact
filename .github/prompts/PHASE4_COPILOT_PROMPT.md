# PHASE 4: Advanced Exports (Months 7-8)

## Overview
Professional export system for board reports, executive presentations, and multi-format data sharing. Enables RegImpact data to integrate with existing corporate workflows.

**Timeline:** Months 7-8  
**Effort:** 200 hours  
**Files:** 6 files  
**Feature Branch:** `feature/phase4-exports`

---

## Features to Implement

1. **Quarterly Board Report** - Auto-generated PowerPoint presentations
2. **Multi-sheet Excel Export** - Comprehensive data workbooks with charts
3. **Calendar Integration** - .ics file generation for deadline tracking
4. **Presentation Mode** - Full-screen dashboard view with navigation
5. **Chart-to-Image Export** - High-resolution chart downloads

---

## Implementation Prompt

```
Implement Phase 4 export system. Board reports, Excel, calendar, presentation mode.

FEATURES:
1. Quarterly Board Report (auto-generated PowerPoint)
2. Multi-sheet Excel Export
3. Calendar Integration (.ics)
4. Presentation Mode (full-screen)
5. Chart-to-Image Export

FILES TO CREATE:

FILE 1: src/lib/export/board-powerpoint.ts
```typescript
import pptxgen from 'pptxgenjs';
import { prisma } from '@/lib/prisma';
import { calculateHealthScore, computeHealthScore } from '@/lib/dashboard/metrics';
import { format, startOfQuarter, endOfQuarter } from 'date-fns';
import html2canvas from 'html2canvas';

interface QuarterData {
  quarter: string;
  year: number;
  healthScore: number;
  healthTrend: number;
  totalCost: number;
  regulationCount: number;
  completedDeadlines: number;
}

export async function generateQuarterlyReport(
  customerId: string,
  quarter: number,
  year: number
): Promise<Blob> {
  const pres = new pptxgen();
  
  // Get customer and quarter data
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  const quarterStart = startOfQuarter(new Date(year, (quarter - 1) * 3, 1));
  const quarterEnd = endOfQuarter(quarterStart);
  
  // Fetch quarter metrics
  const regulations = await prisma.regulation.findMany({
    where: {
      customerId,
      detectedDate: { gte: quarterStart, lte: quarterEnd }
    },
    include: { costEstimate: true, deadlines: true }
  });
  
  const healthComponents = await calculateHealthScore(customerId);
  const healthScore = computeHealthScore(healthComponents);
  
  const quarterData: QuarterData = {
    quarter: `Q${quarter}`,
    year,
    healthScore,
    healthTrend: 5.2, // TODO: Calculate from history
    totalCost: regulations.reduce((sum, r) => sum + (r.costEstimate?.estimatedCost || 0), 0),
    regulationCount: regulations.length,
    completedDeadlines: regulations.reduce((sum, r) => 
      sum + r.deadlines.filter(d => d.status === 'COMPLETED').length, 0
    )
  };
  
  // SLIDE 1: Title
  const titleSlide = pres.addSlide();
  titleSlide.background = { color: '3b82f6' };
  titleSlide.addText(`${customer?.name || 'RegImpact'} Regulatory Compliance Report`, {
    x: 0.5,
    y: 2.0,
    w: 9,
    h: 1.5,
    fontSize: 36,
    bold: true,
    color: 'FFFFFF',
    align: 'center'
  });
  titleSlide.addText(`${quarterData.quarter} ${quarterData.year}`, {
    x: 0.5,
    y: 3.5,
    w: 9,
    h: 0.75,
    fontSize: 24,
    color: 'FFFFFF',
    align: 'center'
  });
  titleSlide.addText(format(new Date(), 'MMMM d, yyyy'), {
    x: 0.5,
    y: 5.0,
    w: 9,
    h: 0.5,
    fontSize: 14,
    color: 'E0E0E0',
    align: 'center'
  });
  
  // SLIDE 2: Executive Summary
  const summarySlide = pres.addSlide();
  summarySlide.addText('Executive Summary', {
    x: 0.5,
    y: 0.5,
    fontSize: 32,
    bold: true,
    color: '1e293b'
  });
  
  // Key metrics grid
  const metrics = [
    { label: 'Compliance Health Score', value: quarterData.healthScore, unit: '/100', color: quarterData.healthScore >= 80 ? '10b981' : 'f59e0b' },
    { label: 'Regulations Tracked', value: quarterData.regulationCount, unit: '', color: '3b82f6' },
    { label: 'Cost Exposure', value: quarterData.totalCost, unit: '', color: 'ef4444', format: 'currency' },
    { label: 'Deadlines Met', value: quarterData.completedDeadlines, unit: '', color: '8b5cf6' }
  ];
  
  metrics.forEach((metric, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = 0.5 + col * 5;
    const y = 1.5 + row * 2;
    
    summarySlide.addShape('rect', {
      x, y, w: 4.5, h: 1.5,
      fill: { color: 'f8fafc' },
      line: { color: 'e2e8f0', width: 1 }
    });
    
    summarySlide.addText(metric.label, {
      x, y: y + 0.2, w: 4.5, h: 0.4,
      fontSize: 12,
      color: '64748b',
      align: 'center'
    });
    
    const displayValue = metric.format === 'currency' 
      ? `$${(metric.value / 1000000).toFixed(1)}M`
      : metric.value + metric.unit;
    
    summarySlide.addText(displayValue, {
      x, y: y + 0.6, w: 4.5, h: 0.7,
      fontSize: 28,
      bold: true,
      color: metric.color,
      align: 'center'
    });
  });
  
  // SLIDE 3: Financial Impact (Cost Waterfall Chart)
  const costSlide = pres.addSlide();
  costSlide.addText('Financial Impact Analysis', {
    x: 0.5,
    y: 0.5,
    fontSize: 28,
    bold: true
  });
  
  // Convert chart to image (would be captured from actual rendered chart)
  // For now, add placeholder or use chart data
  const costChartData = [
    { name: 'Previous Quarter', value: 1000000 },
    { name: 'New Regulations', value: 350000 },
    { name: 'Completed', value: -150000 },
    { name: 'Current Quarter', value: 1200000 }
  ];
  
  costSlide.addChart('bar', costChartData.map(d => ({ name: d.name, values: [d.value] })), {
    x: 0.5,
    y: 1.5,
    w: 9,
    h: 4.5,
    showTitle: false,
    showLegend: false,
    catAxisTitle: 'Category',
    valAxisTitle: 'Cost ($)',
    barDir: 'col'
  });
  
  // SLIDE 4: Regulatory Timeline
  const timelineSlide = pres.addSlide();
  timelineSlide.addText('Regulatory Timeline', {
    x: 0.5,
    y: 0.5,
    fontSize: 28,
    bold: true
  });
  
  // Timeline chart (line chart)
  const timelineData = regulations.reduce((acc, reg) => {
    const month = format(reg.detectedDate, 'MMM');
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  timelineSlide.addChart('line', [{
    name: 'Regulations',
    values: Object.values(timelineData),
    labels: Object.keys(timelineData)
  }], {
    x: 0.5,
    y: 1.5,
    w: 9,
    h: 4.5,
    showTitle: false
  });
  
  // SLIDE 5: Looking Ahead
  const forecastSlide = pres.addSlide();
  forecastSlide.addText('Looking Ahead', {
    x: 0.5,
    y: 0.5,
    fontSize: 28,
    bold: true
  });
  
  const upcomingDeadlines = await prisma.deadline.findMany({
    where: {
      regulation: { customerId },
      dueDate: { gte: new Date() },
      status: { not: 'COMPLETED' }
    },
    include: { regulation: true },
    take: 5,
    orderBy: { dueDate: 'asc' }
  });
  
  forecastSlide.addText('Upcoming Key Deadlines', {
    x: 0.5,
    y: 1.2,
    fontSize: 18,
    bold: true
  });
  
  const deadlineRows = upcomingDeadlines.map(d => [
    format(d.dueDate, 'MMM d, yyyy'),
    d.regulation.title,
    d.type
  ]);
  
  forecastSlide.addTable([
    [{ text: 'Date', options: { bold: true } }, { text: 'Regulation', options: { bold: true } }, { text: 'Type', options: { bold: true } }],
    ...deadlineRows
  ], {
    x: 0.5,
    y: 2.0,
    w: 9,
    h: 3.5,
    border: { type: 'solid', pt: 1, color: 'e2e8f0' },
    fontSize: 11
  });
  
  // Generate and return blob
  const blob = await pres.write({ outputType: 'blob' }) as Blob;
  return blob;
}

// Helper: Capture chart as image using html2canvas
export async function captureChartImage(chartElementId: string): Promise<string> {
  const element = document.getElementById(chartElementId);
  if (!element) throw new Error('Chart element not found');
  
  const canvas = await html2canvas(element, {
    scale: 3, // 300 DPI
    backgroundColor: '#ffffff'
  });
  
  return canvas.toDataURL('image/png');
}
```

FILE 2: src/lib/export/excel-export.ts
```typescript
import ExcelJS from 'exceljs';
import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';

export async function generateFullExport(customerId: string): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  
  workbook.creator = 'RegImpact';
  workbook.created = new Date();
  
  // SHEET 1: Summary Dashboard
  const summarySheet = workbook.addWorksheet('Summary Dashboard', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
  });
  
  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Value', key: 'value', width: 20 }
  ];
  
  const regulations = await prisma.regulation.findMany({
    where: { customerId },
    include: { costEstimate: true, deadlines: true }
  });
  
  const totalCost = regulations.reduce((sum, r) => sum + (r.costEstimate?.estimatedCost || 0), 0);
  const activeRegs = regulations.filter(r => r.status !== 'ARCHIVED').length;
  
  summarySheet.addRows([
    { metric: 'Total Regulations Tracked', value: regulations.length },
    { metric: 'Active Regulations', value: activeRegs },
    { metric: 'Total Cost Exposure', value: totalCost },
    { metric: 'Average Cost per Regulation', value: totalCost / regulations.length || 0 }
  ]);
  
  // Format currency
  summarySheet.getColumn('value').numFmt = '$#,##0.00';
  summarySheet.getRow(1).font = { bold: true };
  summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3b82f6' } };
  summarySheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };
  
  // SHEET 2: All Regulations
  const regsSheet = workbook.addWorksheet('All Regulations');
  regsSheet.columns = [
    { header: 'Title', key: 'title', width: 40 },
    { header: 'Jurisdiction', key: 'jurisdiction', width: 20 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Priority', key: 'priority', width: 12 },
    { header: 'Detected Date', key: 'detectedDate', width: 15 },
    { header: 'Estimated Cost', key: 'estimatedCost', width: 15 }
  ];
  
  regsSheet.addRows(regulations.map(r => ({
    title: r.title,
    jurisdiction: r.jurisdiction,
    status: r.status,
    priority: r.priority,
    detectedDate: format(r.detectedDate, 'yyyy-MM-dd'),
    estimatedCost: r.costEstimate?.estimatedCost || 0
  })));
  
  regsSheet.getRow(1).font = { bold: true };
  regsSheet.autoFilter = { from: 'A1', to: 'F1' };
  
  // Color code by priority
  regsSheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const priority = row.getCell('priority').value;
    if (priority === 'CRITICAL') {
      row.getCell('priority').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFef4444' } };
    } else if (priority === 'HIGH') {
      row.getCell('priority').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFf59e0b' } };
    }
  });
  
  // SHEET 3: Cost Estimates
  const costSheet = workbook.addWorksheet('Cost Estimates');
  costSheet.columns = [
    { header: 'Regulation', key: 'regulation', width: 40 },
    { header: 'Estimated Cost', key: 'estimatedCost', width: 15 },
    { header: 'Actual Cost', key: 'actualCost', width: 15 },
    { header: 'Variance', key: 'variance', width: 12 },
    { header: 'Department', key: 'department', width: 20 }
  ];
  
  const estimates = await prisma.costEstimate.findMany({
    where: { regulation: { customerId } },
    include: { regulation: true }
  });
  
  costSheet.addRows(estimates.map(e => ({
    regulation: e.regulation.title,
    estimatedCost: e.estimatedCost,
    actualCost: e.actualCost || 0,
    variance: e.actualCost ? ((e.actualCost - e.estimatedCost) / e.estimatedCost) : 0,
    department: e.departmentBreakdown ? Object.keys(JSON.parse(e.departmentBreakdown as string))[0] : 'N/A'
  })));
  
  costSheet.getColumn('variance').numFmt = '0.0%';
  
  // SHEET 4: Deadlines
  const deadlineSheet = workbook.addWorksheet('Deadlines');
  deadlineSheet.columns = [
    { header: 'Regulation', key: 'regulation', width: 40 },
    { header: 'Type', key: 'type', width: 20 },
    { header: 'Due Date', key: 'dueDate', width: 15 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Days Until Due', key: 'daysUntil', width: 12 }
  ];
  
  const deadlines = await prisma.deadline.findMany({
    where: { regulation: { customerId } },
    include: { regulation: true }
  });
  
  deadlineSheet.addRows(deadlines.map(d => ({
    regulation: d.regulation.title,
    type: d.type,
    dueDate: format(d.dueDate, 'yyyy-MM-dd'),
    status: d.status,
    daysUntil: Math.ceil((d.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  })));
  
  // SHEET 5: Raw Data (for pivot tables)
  const rawSheet = workbook.addWorksheet('Raw Data');
  rawSheet.columns = [
    { header: 'Regulation ID', key: 'id', width: 25 },
    { header: 'Title', key: 'title', width: 40 },
    { header: 'Jurisdiction', key: 'jurisdiction', width: 20 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Priority', key: 'priority', width: 12 },
    { header: 'Cost', key: 'cost', width: 15 },
    { header: 'Deadline Count', key: 'deadlineCount', width: 12 }
  ];
  
  rawSheet.addRows(regulations.map(r => ({
    id: r.id,
    title: r.title,
    jurisdiction: r.jurisdiction,
    status: r.status,
    priority: r.priority,
    cost: r.costEstimate?.estimatedCost || 0,
    deadlineCount: r.deadlines.length
  })));
  
  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as Buffer;
}
```

FILE 3: src/lib/export/calendar-export.ts
```typescript
import ics, { EventAttributes } from 'ics';
import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';

export async function generateCalendarFile(customerId: string): Promise<string> {
  const deadlines = await prisma.deadline.findMany({
    where: {
      regulation: { customerId },
      status: { not: 'COMPLETED' }
    },
    include: { regulation: true },
    orderBy: { dueDate: 'asc' }
  });
  
  const events: EventAttributes[] = deadlines.map(deadline => {
    const dueDate = deadline.dueDate;
    
    // Color coding by risk
    const daysUntil = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    let category: string;
    if (daysUntil <= 7) category = 'RED';
    else if (daysUntil <= 30) category = 'YELLOW';
    else category = 'GREEN';
    
    return {
      start: [dueDate.getFullYear(), dueDate.getMonth() + 1, dueDate.getDate()],
      title: `${deadline.type}: ${deadline.regulation.title}`,
      description: [
        `Regulation: ${deadline.regulation.title}`,
        `Jurisdiction: ${deadline.regulation.jurisdiction}`,
        `Priority: ${deadline.regulation.priority}`,
        `Type: ${deadline.type}`,
        `\nView in RegImpact: ${process.env.NEXT_PUBLIC_URL}/deadlines/${deadline.id}`
      ].join('\n'),
      categories: [category, 'RegImpact', 'Compliance'],
      status: 'CONFIRMED',
      busyStatus: 'BUSY',
      alarms: [
        { action: 'display', trigger: { days: 30, before: true }, description: '30 days until deadline' },
        { action: 'display', trigger: { days: 7, before: true }, description: '7 days until deadline' },
        { action: 'display', trigger: { days: 1, before: true }, description: 'Tomorrow: Compliance deadline' }
      ]
    };
  });
  
  const { error, value } = ics.createEvents(events);
  
  if (error) {
    throw new Error(`Calendar generation failed: ${error}`);
  }
  
  return value!;
}
```

FILE 4: src/components/export/PresentationMode.tsx
```tsx
'use client';
import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { HealthScoreGauge } from '@/components/dashboard/HealthScoreGauge';
import { CostWaterfall } from '@/ components/dashboard/CostWaterfall';
import { RegulatoryTimeline } from '@/components/dashboard/RegulatoryTimeline';

const SECTIONS = [
  { id: 'health', title: 'Compliance Health', component: 'HealthScoreGauge' },
  { id: 'cost', title: 'Cost Exposure', component: 'CostWaterfall' },
  { id: 'timeline', title: 'Regulatory Timeline', component: 'RegulatoryTimeline' },
  { id: 'deadlines', title: 'Upcoming Deadlines', component: 'DeadlinesList' }
];

export function PresentationMode({ data }: { data: any }) {
  const [isActive, setIsActive] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const [pointerPosition, setPointerPosition] = useState<{ x: number; y: number } | null>(null);
  
  useEffect(() => {
    if (!isActive) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsActive(false);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        setCurrentSection(prev => Math.min(SECTIONS.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        setCurrentSection(prev => Math.max(0, prev - 1));
      }
    };
    
    const handleClick = (e: MouseEvent) => {
      setPointerPosition({ x: e.clientX, y: e.clientY });
      setTimeout(() => setPointerPosition(null), 1000);
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('click', handleClick);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('click', handleClick);
    };
  }, [isActive]);
  
  if (!isActive) {
    return (
      <button
        onClick={() => setIsActive(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Enter Presentation Mode
      </button>
    );
  }
  
  const section = SECTIONS[currentSection];
  
  return (
    <div className="fixed inset-0 z-50 bg-black text-white">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent">
        <h1 className="text-3xl font-bold">{section.title}</h1>
        <button
          onClick={() => setIsActive(false)}
          className="p-2 hover:bg-white/10 rounded-full transition"
        >
          <X className="w-8 h-8" />
        </button>
      </div>
      
      {/* Content */}
      <div className="h-full flex items-center justify-center p-20">
        <div className="w-full h-full bg-white text-black rounded-xl shadow-2xl p-12 overflow-auto">
          {section.component === 'HealthScoreGauge' && <HealthScoreGauge {...data.health} />}
          {section.component === 'CostWaterfall' && <CostWaterfall {...data.cost} />}
          {section.component === 'RegulatoryTimeline' && <RegulatoryTimeline {...data.timeline} />}
          {section.component === 'DeadlinesList' && (
            <div className="space-y-4">
              {data.deadlines.map((deadline: any) => (
                <div key={deadline.id} className="p-4 border-l-4 border-red-500 bg-gray-50">
                  <h3 className="font-semibold">{deadline.title}</h3>
                  <p className="text-sm text-gray-600">{deadline.type} - Due {format(deadline.dueDate, 'MMM d, yyyy')}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Navigation */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-4">
        <button
          onClick={() => setCurrentSection(prev => Math.max(0, prev - 1))}
          disabled={currentSection === 0}
          className="p-3 bg-white/20 rounded-full hover:bg-white/30 disabled:opacity-30"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        
        <div className="flex gap-2">
          {SECTIONS.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setCurrentSection(idx)}
              className={`w-3 h-3 rounded-full transition ${
                idx === currentSection ? 'bg-white' : 'bg-white/30'
              }`}
            />
          ))}
        </div>
        
        <button
          onClick={() => setCurrentSection(prev => Math.min(SECTIONS.length - 1, prev + 1))}
          disabled={currentSection === SECTIONS.length - 1}
          className="p-3 bg-white/20 rounded-full hover:bg-white/30 disabled:opacity-30"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
      
      {/* Laser pointer effect */}
      {pointerPosition && (
        <div
          className="absolute w-8 h-8 border-4 border-red-500 rounded-full pointer-events-none animate-ping"
          style={{ left: pointerPosition.x - 16, top: pointerPosition.y - 16 }}
        />
      )}
      
      {/* Instructions */}
      <div className="absolute bottom-8 right-8 text-sm text-white/60">
        Use arrow keys to navigate • ESC to exit • Click for laser pointer
      </div>
    </div>
  );
}
```

FILE 5: src/components/export/ChartExporter.tsx
```tsx
'use client';
import html2canvas from 'html2canvas';
import { Download } from 'lucide-react';

interface ChartExporterProps {
  chartId: string;
  filename: string;
  format?: 'png' | 'svg';
  resolution?: number; // DPI
}

export function ChartExporter({
  chartId,
  filename,
  format = 'png',
  resolution = 300
}: ChartExporterProps) {
  const exportChart = async () => {
    const element = document.getElementById(chartId);
    if (!element) {
      console.error('Chart element not found');
      return;
    }
    
    const canvas = await html2canvas(element, {
      scale: resolution / 96, // 96 DPI is browser default
      backgroundColor: 'transparent',
      logging: false
    });
    
    if (format === 'png') {
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }, 'image/png');
    } else if (format === 'svg') {
      // For SVG, would need to serialize the SVG element
      const svg Element = element.querySelector('svg');
      if (svgElement) {
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.svg`;
        a.click();
        URL.revokeObjectURL(url);
      }
    }
  };
  
  return (
    <button
      onClick={exportChart}
      className="inline-flex items-center gap-2 px-3 py-1 text-sm border rounded hover:bg-gray-50"
      title={`Export as ${format.toUpperCase()} (${resolution} DPI)`}
    >
      <Download className="w-4 h-4" />
      Export Chart
    </button>
  );
}
```

FILE 6: src/app/api/export/[type]/route.ts
```typescript
import { NextRequest } from 'next/server';
import { generateQuarterlyReport } from '@/lib/export/board-powerpoint';
import { generateFullExport } from '@/lib/export/excel-export';
import { generateCalendarFile } from '@/lib/export/calendar-export';

export async function GET(
  request: NextRequest,
  { params }: { params: { type: string } }
) {
  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get('customerId');
  
  if (!customerId) {
    return Response.json({ error: 'Missing customerId' }, { status: 400 });
  }
  
  try {
    switch (params.type) {
      case 'board-report': {
        const quarter = parseInt(searchParams.get('quarter') || '1', 10);
        const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString(), 10);
        
        const blob = await generateQuarterlyReport(customerId, quarter, year);
        
        return new Response(blob, {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'Content-Disposition': `attachment; filename="RegImpact_Q${quarter}_${year}_Board_Report.pptx"`
          }
        });
      }
      
      case 'excel': {
        const buffer = await generateFullExport(customerId);
        
        return new Response(buffer, {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename="RegImpact_Export.xlsx"'
          }
        });
      }
      
      case 'calendar': {
        const icsContent = await generateCalendarFile(customerId);
        
        return new Response(icsContent, {
          headers: {
            'Content-Type': 'text/calendar; charset=utf-8',
            'Content-Disposition': 'attachment; filename="RegImpact_Deadlines.ics"'
          }
        });
      }
      
      default:
        return Response.json({ error: 'Invalid export type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Export error:', error);
    return Response.json({ error: 'Export failed' }, { status: 500 });
  }
}
```

DEPENDENCIES:
npm install pptxgenjs exceljs ics html2canvas lucide-react

TESTING:
□ PowerPoint opens correctly in Microsoft PowerPoint and Google Slides
□ PowerPoint charts render properly
□ Excel file contains all 5 sheets with correct data
□ Excel charts are embedded
□ Excel filters and formatting work
□ Calendar file imports to Google Calendar, Outlook, and Apple Calendar
□ Calendar events have correct dates and reminders
□ Presentation mode keyboard navigation works
□ Presentation mode displays all sections correctly
□ Chart exports are high resolution (300 DPI minimum)
□ Chart exports have transparent backgrounds when specified
□ All export API endpoints return correct MIME types

EFFORT: 200 hours
```

---

## Acceptance Criteria

- [ ] PowerPoint generates with all slides
- [ ] PowerPoint opens without errors in MS Office and Google Slides
- [ ] Excel workbook contains 5 sheets with data
- [ ] Excelfilters and pivot tables work
- [ ] Calendar .ics imports successfully to major calendar apps
- [ ] Presentation mode renders full-screen
- [ ] Keyboard navigation works in presentation mode
- [ ] Chart exports are high-resolution (300 DPI)
- [ ] All exports have correct MIME types and file extensions

---

## Dependencies

```json
{
  "pptxgenjs": "^3.12.0",
  "exceljs": "^4.4.0",
  "ics": "^3.7.0",
  "html2canvas": "^1.4.1",
  "lucide-react": "^0.300.0"
}
```

---

## Related Files

- Architecture reference: `COPILOT_CONTEXT.md`
- Main plan: `plan-executiveDashboardEnhancements.prompt.md`
