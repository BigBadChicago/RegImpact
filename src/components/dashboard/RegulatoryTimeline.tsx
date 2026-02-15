'use client'

import { useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Scatter } from 'recharts'
import type { TooltipProps } from 'recharts'
import { TimelineEvent } from '@/types/dashboard'

interface Props {
  events: TimelineEvent[]
}

type TimeRange = '3m' | '6m' | '1y' | 'all'

interface TimelineData extends Omit<TimelineEvent, 'date'> {
  date: string // formatted date
  count: number // running count of regulations
  regulation: TimelineEvent['regulation']
  type: TimelineEvent['type']
  status: TimelineEvent['status']
}

type TimelineTooltipProps = TooltipProps<number, string>

/**
 * Typed tooltip component for regulatory timeline
 */
function RegulatoryTimelineTooltip({ active, payload }: TimelineTooltipProps) {
  if (!active || !payload || !payload.length) return null

  const data = payload[0].payload as TimelineData

  return (
    <div className="bg-white p-3 rounded shadow-lg border border-gray-200 max-w-xs">
      <p className="font-medium text-gray-900 text-sm">{data.regulation?.title || 'Regulation'}</p>
      <p className="text-xs text-gray-600 mt-1">{data.date}</p>
      <p className="text-xs text-gray-600">Type: {data.type}</p>
      <p
        className={`text-xs font-medium mt-1 ${
          data.status === 'overdue'
            ? 'text-red-600'
            : data.status === 'due-soon'
              ? 'text-yellow-600'
              : 'text-green-600'
        }`}
      >
        {data.status.replace('-', ' ').toUpperCase()}
      </p>
    </div>
  )
}

/**
 * Get status color for scatter points
 */
function getStatusColor(status: string): string {
  switch (status) {
    case 'upcoming':
      return '#10b981' // green
    case 'due-soon':
      return '#eab308' // yellow
    case 'overdue':
      return '#ef4444' // red
    default:
      return '#6b7280' // gray
  }
}

export default function RegulatoryTimeline({ events }: Props) {
  const [timeRange, setTimeRange] = useState<TimeRange>('1y')

  // Memoize filtered and sorted events
  const filteredEvents = useMemo(() => {
    const now = new Date()

    const filtered = events.filter((event) => {
      const eventDate = new Date(event.date)
      const monthsDiff = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)

      switch (timeRange) {
        case '3m':
          return monthsDiff >= -1 && monthsDiff <= 3
        case '6m':
          return monthsDiff >= -1 && monthsDiff <= 6
        case '1y':
          return monthsDiff >= -1 && monthsDiff <= 12
        case 'all':
        default:
          return true
      }
    })

    return filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [events, timeRange])

  // Memoize timeline data transformation
  const timelineData: TimelineData[] = useMemo(
    () =>
            filteredEvents.map((event, index) => ({
        ...event,
        date: new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count: index + 1
            })),
    [filteredEvents]
  )

  return (
    <div className="bg-white rounded-lg shadow-md p-6 w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Regulatory Timeline</h3>

        {/* Time Range Selector */}
        <div className="flex gap-2">
          {(['3m', '6m', '1y', 'all'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range === '3m' ? '3m' : range === '6m' ? '6m' : range === '1y' ? '1y' : 'All'}
            </button>
          ))}
        </div>
      </div>

      {filteredEvents.length > 0 ? (
        <div className="w-full overflow-x-auto">
          <ResponsiveContainer width="100%" height={300} minWidth={500}>
            <LineChart data={timelineData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                label={{ value: 'Regulation Count', angle: -90, position: 'insideLeft' }}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<RegulatoryTimelineTooltip />} />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                isAnimationActive={true}
                animationDuration={2000}
              />

              {/* Scatter points for each regulation status */}
              <Scatter
                data={timelineData}
                shape={(props: unknown) => {
                  const { payload, cx, cy } = props as { payload: TimelineData; cx: number; cy: number }
                  const color = getStatusColor(payload?.status || 'upcoming')
                  return <circle cx={cx} cy={cy} r={4} fill={color} />
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-[300px] flex items-center justify-center text-gray-500">
          No upcoming deadlines in this period
        </div>
      )}

      {/* Status Legend */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-600" />
          <span className="text-gray-600">Upcoming</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span className="text-gray-600">Due Soon</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-600" />
          <span className="text-gray-600">Overdue</span>
        </div>
      </div>
    </div>
  )
}
