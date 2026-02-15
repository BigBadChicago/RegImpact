'use client'

import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useState } from 'react'

interface MatrixCell {
  department: string
  regulationType: string
  impactScore: number // 0-100
  regulationCount: number
  totalCost: number
  totalHours: number
}

interface Props {
  data: MatrixCell[]
  onCellClick?: (department: string, regulationType: string) => void
}

const DEPARTMENTS = ['HR', 'Finance', 'Operations', 'Legal', 'IT', 'Sales']
const REGULATION_TYPES = ['Employment', 'Financial', 'Safety', 'Data Privacy', 'Industry-Specific']

const getColor = (score: number): string => {
  if (score < 30) return '#10b981' // Green
  if (score < 70) return '#f59e0b' // Yellow
  return '#ef4444' // Red
}

const getImpactScore = (totalCost: number, totalHours: number): number => {
  return Math.min(100, (totalCost / 1000) + (totalHours / 10))
}

export default function DepartmentMatrix({ data, onCellClick }: Props) {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null)

  // Transform data for scatter plot: x = regulation type, y = department
  const deptIndex = (dept: string) => DEPARTMENTS.indexOf(dept)
  const typeIndex = (type: string) => REGULATION_TYPES.indexOf(type)

  const chartData = data.map(cell => ({
    ...cell,
    x: typeIndex(cell.regulationType),
    y: deptIndex(cell.department),
    size: Math.max(10, Math.min(200, cell.regulationCount * 15))
  }))

  const CustomTooltip = (props: any) => {
    if (!props.active || !props.payload?.length) return null
    const data = props.payload[0].payload
    return (
      <div className="bg-white p-3 rounded shadow-lg border border-gray-200">
        <p className="font-semibold text-sm">
          {data.department} - {data.regulationType}
        </p>
        <p className="text-xs text-gray-600">Impact Score: {Math.round(data.impactScore)}</p>
        <p className="text-xs text-gray-600">Count: {data.regulationCount}</p>
        <p className="text-xs text-gray-600">
          Cost: ${(data.totalCost / 1000).toFixed(1)}K
        </p>
        <p className="text-xs text-gray-600">Hours: {Math.round(data.totalHours)}</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Department Impact Matrix</h3>
          <p className="text-sm text-gray-500">
            Click cells to filter dashboard by department and regulation type
          </p>
        </div>

        {/* Legend */}
        <div className="flex gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981' }} />
            <span>Low Impact (&lt;$10K, &lt;40h)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f59e0b' }} />
            <span>Medium Impact ($10K-$50K, 40-100h)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }} />
            <span>High Impact (&gt;$50K, &gt;100h)</span>
          </div>
        </div>

        {/* Matrix Chart */}
        <div className="w-full overflow-x-auto">
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 60, left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="x"
                name="Regulation Type"
                type="number"
                domain={[-0.5, REGULATION_TYPES.length - 0.5]}
                tickFormatter={index => {
                  const rounded = Math.round(index)
                  return REGULATION_TYPES[rounded] || ''
                }}
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis
                dataKey="y"
                name="Department"
                type="number"
                domain={[-0.5, DEPARTMENTS.length - 0.5]}
                tickFormatter={index => {
                  const rounded = Math.round(index)
                  return DEPARTMENTS[rounded] || ''
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Scatter
                name="Regulations"
                data={chartData}
                fill="#3b82f6"
                onClick={(point: any) => {
                  if (onCellClick) {
                    onCellClick(point.department, point.regulationType)
                  }
                }}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getColor(entry.impactScore)}
                    opacity={hoveredCell === null || hoveredCell === `${entry.department}-${entry.regulationType}` ? 1 : 0.4}
                    style={{
                      cursor: 'pointer',
                      transition: 'opacity 0.2s'
                    }}
                    onMouseEnter={() => setHoveredCell(`${entry.department}-${entry.regulationType}`)}
                    onMouseLeave={() => setHoveredCell(null)}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-xs text-gray-500">Total Regulations</p>
            <p className="text-lg font-semibold text-gray-900">
              {data.reduce((sum, d) => sum + d.regulationCount, 0)}
            </p>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-xs text-gray-500">Total Cost Exposure</p>
            <p className="text-lg font-semibold text-gray-900">
              ${(data.reduce((sum, d) => sum + d.totalCost, 0) / 1000000).toFixed(1)}M
            </p>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-xs text-gray-500">Avg Impact Score</p>
            <p className="text-lg font-semibold text-gray-900">
              {Math.round(data.reduce((sum, d) => sum + d.impactScore, 0) / data.length)}
            </p>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-xs text-gray-500">Total Hours</p>
            <p className="text-lg font-semibold text-gray-900">
              {Math.round(data.reduce((sum, d) => sum + d.totalHours, 0))}K
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
