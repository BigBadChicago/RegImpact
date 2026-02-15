'use client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { CostWaterfallData } from '@/types/dashboard-enhanced'

interface Props {
  data: CostWaterfallData
  onBarClick?: (regulationId: string) => void
}

export default function CostWaterfallChart({ data, onBarClick }: Props) {
  // Transform data for Recharts waterfall
  const chartData = [
    { name: 'Current Exposure', value: data.starting, color: '#3B82F6', type: 'base', regulationId: null },
    ...data.additions.map(item => ({
      name: item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name,
      value: item.value,
      color: '#10B981',  // Green for additions
      type: 'addition',
      regulationId: item.regulationId
    })),
    ...data.reductions.map(item => ({
      name: item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name,
      value: -item.value,  // Negative for reductions
      color: '#EF4444',  // Red for reductions
      type: 'reduction',
      regulationId: item.regulationId
    })),
    { name: 'Projected Exposure', value: data.ending, color: '#3B82F6', type: 'base', regulationId: null }
  ]

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.abs(value))
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-sm font-medium text-gray-700 mb-4">Cost Exposure Waterfall</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} fontSize={12} />
          <YAxis tickFormatter={formatCurrency} />
          <Tooltip formatter={(value: number) => formatCurrency(value)} />
          <Bar
            dataKey="value"
            onClick={(data: { regulationId?: string | null }) => data.regulationId && onBarClick?.(data.regulationId)}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} cursor={entry.regulationId ? 'pointer' : 'default'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
