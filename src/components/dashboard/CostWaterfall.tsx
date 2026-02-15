'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import { WaterfallDataPoint } from '@/types/dashboard'

interface Props {
  data: WaterfallDataPoint[]
}

export default function CostWaterfall({ data }: Props) {
  // Convert waterfall data to stacked bar format
  // For waterfall: start, sum(increases), sum(decreases), end
  const transformedData = data.map((point, index) => {
    const baseValue = point.type === 'start' || point.type === 'end' ? point.value : 0
    const positiveValue = point.type === 'increase' ? point.value : 0
    const negativeValue = point.type === 'decrease' ? Math.abs(point.value) : 0

    return {
      label: point.label,
      value: baseValue,
      increase: positiveValue,
      decrease: negativeValue,
      color: point.color,
      type: point.type,
      originalValue: point.value
    }
  })

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 rounded shadow-lg border border-gray-200">
          <p className="font-medium text-gray-900">{data.label}</p>
          <p className="text-sm text-gray-600">
            ${typeof data.originalValue === 'number' ? (data.originalValue / 1000).toFixed(0) : '0'}K
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 w-full">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Exposure Waterfall</h3>
      
      <div className="w-full overflow-x-auto">
        <ResponsiveContainer width="100%" height={300} minWidth={500}>
          <BarChart
            data={transformedData}
            margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="label"
              angle={-45}
              textAnchor="end"
              height={100}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {/* Start/End bars */}
            <Bar
              dataKey="value"
              fill="#3b82f6"
              radius={[8, 8, 0, 0]}
              isAnimationActive={true}
              animationDuration={2000}
            />
            
            {/* Increase bars */}
            <Bar
              dataKey="increase"
              fill="#ef4444"
              stackId="stack"
              radius={[8, 8, 0, 0]}
            />
            
            {/* Decrease bars */}
            <Bar
              dataKey="decrease"
              fill="#10b981"
              stackId="stack"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-4 flex gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded" />
          <span className="text-gray-600">Start/End Balance</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded" />
          <span className="text-gray-600">Cost Increases</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded" />
          <span className="text-gray-600">Cost Decreases</span>
        </div>
      </div>
    </div>
  )
}
