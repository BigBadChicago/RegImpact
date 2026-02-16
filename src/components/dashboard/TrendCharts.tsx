'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ComposedChart, Area, AreaChart } from 'recharts'
import { useState } from 'react'

interface VelocityData {
  month: string
  count: number
  change: number
}

interface CostTrendData {
  month: string
  totalCost: number
  rollingAverage: number
}

interface HealthScoreData {
  month: string
  score: number
}

interface ForecastData {
  month: string
  predicted: number
  confidence: number
  upper?: number
  lower?: number
}

interface Props {
  velocity?: VelocityData[]
  costTrend?: CostTrendData[]
  healthScores?: HealthScoreData[]
  forecast?: ForecastData[]
  isLoading?: boolean
}

type TimePeriod = '6m' | '1y' | '2y'
type Metric = 'velocity' | 'cost' | 'score'

export default function TrendCharts({
  velocity = [],
  costTrend = [],
  healthScores = [],
  forecast = [],
  isLoading = false
}: Props) {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('1y')
  const [metric, setMetric] = useState<Metric>('velocity')

  // Filter data by time period
  const filterByPeriod = (data: any[]) => {
    const months = timePeriod === '6m' ? 6 : timePeriod === '1y' ? 12 : 24
    return data.slice(-months)
  }

  const filteredVelocity = filterByPeriod(velocity)
  const filteredCostTrend = filterByPeriod(costTrend)
  const filteredHealthScores = filterByPeriod(healthScores)

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-80 bg-gray-100 rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Trend Analysis</h3>
            <p className="text-sm text-gray-500">Historical trends and forecasts</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Time Period Selector */}
            <div className="flex gap-2">
              {(['6m', '1y', '2y'] as const).map(period => (
                <button
                  key={period}
                  onClick={() => setTimePeriod(period)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    timePeriod === period
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Chart 1: Regulatory Velocity */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-4">Regulatory Velocity</h4>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={filteredVelocity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const data = payload[0].payload
                    return (
                      <div className="bg-white p-2 rounded shadow-lg border border-gray-200">
                        <p className="text-xs font-medium">{data.month}</p>
                        <p className="text-xs text-blue-600">Count: {data.count}</p>
                        {data.change !== undefined && (
                          <>
                            {/* In this chart, increased regulatory velocity means higher compliance burden,
                                so increases are shown in red and decreases in green. */}
                            <p className={`text-xs ${data.change >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                              Change: {data.change > 0 ? '+' : ''}{data.change.toFixed(1)}%
                            </p>
                          </>
                        )}
                      </div>
                    )
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 3 }}
                  activeDot={{ r: 5 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Chart 2: Cost Trend */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-4">Cost Exposure Trend (3M Rolling Avg)</h4>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={filteredCostTrend}>
                <defs>
                  <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const data = payload[0].payload
                    return (
                      <div className="bg-white p-2 rounded shadow-lg border border-gray-200">
                        <p className="text-xs font-medium">{data.month}</p>
                        <p className="text-xs text-orange-600">Total: ${(data.totalCost / 1000000).toFixed(2)}M</p>
                        <p className="text-xs text-orange-500">
                          3M Avg: ${(data.rollingAverage / 1000000).toFixed(2)}M
                        </p>
                      </div>
                    )
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="rollingAverage"
                  stroke="#f97316"
                  fill="url(#costGradient)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Chart 3: Compliance Score History */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-4">Compliance Score History</h4>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={filteredHealthScores}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <ReferenceLine y={80} stroke="#9ca3af" strokeDasharray="5 5" label={{ value: 'Target: 80', position: 'right', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const data = payload[0].payload
                    return (
                      <div className="bg-white p-2 rounded shadow-lg border border-gray-200">
                        <p className="text-xs font-medium">{data.month}</p>
                        <p className="text-xs text-green-600">Score: {data.score}</p>
                      </div>
                    )
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: '#10b981', r: 3 }}
                  activeDot={{ r: 5 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Chart 4: Forecast */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-4">Regulation Count Forecast (3M)</h4>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={forecast}>
                <defs>
                  <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d1d5db" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#d1d5db" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const data = payload[0].payload
                    return (
                      <div className="bg-white p-2 rounded shadow-lg border border-gray-200">
                        <p className="text-xs font-medium">{data.month}</p>
                        <p className="text-xs text-purple-600">Predicted: {data.predicted}</p>
                        {data.confidence !== undefined && (
                          <p className="text-xs text-gray-600">Confidence: {data.confidence}%</p>
                        )}
                      </div>
                    )
                  }}
                />
                {forecast.some(d => d.upper) && (
                  <Area
                    type="monotone"
                    dataKey="upper"
                    fill="url(#confidenceGradient)"
                    stroke="none"
                    isAnimationActive={false}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: '#8b5cf6', r: 3 }}
                  activeDot={{ r: 5 }}
                  isAnimationActive={false}
                  name="Forecast"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
