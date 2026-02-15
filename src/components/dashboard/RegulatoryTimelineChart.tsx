'use client'
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts'
import { TimelineRegulation } from '@/types/dashboard-enhanced'
import { format } from 'date-fns'

interface Props {
  regulations: TimelineRegulation[]
  onRegulationClick?: (id: string) => void
}

export default function RegulatoryTimelineChart({ regulations, onRegulationClick }: Props) {
  // Group by month
  const grouped = regulations.reduce((acc, reg) => {
    const month = format(new Date(reg.deadline), 'MMM yyyy')
    if (!acc[month]) acc[month] = []
    acc[month].push(reg)
    return acc
  }, {} as Record<string, TimelineRegulation[]>)

  const chartData = Object.entries(grouped)
    .map(([month, regs]) => ({
      month,
      count: regs.length,
      totalCost: regs.reduce((sum, r) => sum + r.cost, 0),
      critical: regs.filter(r => r.riskLevel === 'CRITICAL').length,
      regulations: regs
    }))
    .sort((a, b) => {
      const dateA = new Date(a.regulations[0].deadline)
      const dateB = new Date(b.regulations[0].deadline)
      return dateA.getTime() - dateB.getTime()
    })

  const getRiskColor = (critical: number, total: number) => {
    const ratio = critical / total
    if (ratio > 0.5) return '#DC2626'  // Red
    if (ratio > 0.25) return '#F59E0B'  // Yellow
    return '#10B981'  // Green
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      notation: 'compact'
    }).format(value)
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-sm font-medium text-gray-700 mb-4">Regulatory Timeline (Next 12 Months)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" angle={-45} textAnchor="end" height={80} fontSize={12} />
          <YAxis yAxisId="left" label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
          <YAxis 
            yAxisId="right" 
            orientation="right" 
            tickFormatter={formatCurrency}
            label={{ value: 'Cost', angle: 90, position: 'insideRight' }} 
          />
          <Tooltip 
            formatter={(value: number, name: string) => {
              if (name === 'totalCost') return formatCurrency(value)
              return value
            }}
            labelFormatter={(label) => `Month: ${label}`}
          />
          <Legend />
          <Bar
            yAxisId="left"
            dataKey="count"
            name="Regulation Count"
            onClick={(data: { regulations?: TimelineRegulation[] }) => data.regulations?.[0] && onRegulationClick?.(data.regulations[0].id)}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getRiskColor(entry.critical, entry.count)} cursor="pointer" />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
      
      {/* Legend */}
      <div className="flex justify-center gap-6 mt-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-600 rounded"></div>
          <span>High Risk (&gt;50% critical)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-yellow-500 rounded"></div>
          <span>Medium Risk (25-50% critical)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span>Low Risk (&lt;25% critical)</span>
        </div>
      </div>
    </div>
  )
}
