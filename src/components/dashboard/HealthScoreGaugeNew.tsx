'use client'

import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer, Cell, Legend, Tooltip } from 'recharts'
import { HealthScoreComponents } from '@/types/dashboard'

interface Props {
  score: number // 0-100
  trend: number // % change
  components: HealthScoreComponents
}

export default function HealthScoreGauge({ score, trend, components }: Props) {
  // Determine color based on score zones
  const getColor = (value: number) => {
    if (value < 60) return '#ef4444' // red
    if (value < 80) return '#eab308' // yellow
    return '#10b981' // green
  }

  const color = getColor(score)

  // Data for radial bar chart showing component breakdown
  const data = [
    {
      name: 'Deadline Adherence',
      value: components.deadlineAdherence,
      fill: '#3b82f6'
    },
    {
      name: 'Cost Predictability',
      value: components.costPredictability,
      fill: '#8b5cf6'
    },
    {
      name: 'Risk Exposure',
      value: components.riskExposure,
      fill: '#ec4899'
    }
  ]

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded shadow-lg border border-gray-200">
          <p className="font-medium text-gray-900">{payload[0].name}</p>
          <p className="text-sm text-gray-600">{payload[0].value.toFixed(1)}%</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 min-h-[300px] flex flex-col">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Compliance Health Score</h3>
      
      {/* Score Display */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="relative w-28 h-28 flex items-center justify-center">
            <div className={`text-center`}>
              <div className={`text-5xl font-bold ${color === '#ef4444' ? 'text-red-600' : color === '#eab308' ? 'text-yellow-600' : 'text-green-600'}`}>
                {score}
              </div>
              <div className="text-xs text-gray-500 mt-1">out of 100</div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Trend:</span>
              <span className={`font-medium ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
              </span>
            </div>
            <div className="text-xs text-gray-500">vs last period</div>
          </div>
        </div>

        {/* Status Indicator */}
        <div className={`w-3 h-3 rounded-full ${color === '#ef4444' ? 'bg-red-600' : color === '#eab308' ? 'bg-yellow-600' : 'bg-green-600'}`} />
      </div>

      {/* Component Breakdown */}
      <div className="mt-auto">
        <ResponsiveContainer width="100%" height={180}>
          <RadialBarChart
            data={data}
            innerRadius="20%"
            outerRadius="100%"
            margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
          >
            <PolarAngleAxis
              type="number"
              domain={[0, 100]}
              tick={false}
            />
            <RadialBar
              name="Score"
              dataKey="value"
              cornerRadius={10}
              label={{ position: 'insideStart', fill: '#fff', fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>

      {/* Component Details */}
      <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-gray-500">Deadline</p>
          <p className="font-semibold text-gray-900">{components.deadlineAdherence.toFixed(0)}%</p>
        </div>
        <div>
          <p className="text-gray-500">Cost</p>
          <p className="font-semibold text-gray-900">{components.costPredictability.toFixed(0)}%</p>
        </div>
        <div>
          <p className="text-gray-500">Risk</p>
          <p className="font-semibold text-gray-900">{components.riskExposure.toFixed(0)}%</p>
        </div>
      </div>
    </div>
  )
}
