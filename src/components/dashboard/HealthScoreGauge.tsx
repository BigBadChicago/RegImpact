'use client'
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts'
import { ComplianceHealthScore } from '@/types/dashboard-enhanced'

interface Props {
  healthScore: ComplianceHealthScore
  onClick?: () => void  // Drill-down to detail modal
}

export default function HealthScoreGauge({ healthScore, onClick }: Props) {
  const { score, components, trend, industryBenchmark } = healthScore
  
  // Color zones
  const color = score < 60 ? '#DC2626' : score < 80 ? '#F59E0B' : '#10B981'
  
  // Gauge data (score out of 100)
  const data = [
    { name: 'Score', value: score },
    { name: 'Remaining', value: 100 - score }
  ]

  return (
    <div 
      className={`bg-white rounded-lg shadow p-6 transition-shadow ${
        onClick ? 'cursor-pointer hover:shadow-lg' : ''
      }`}
      onClick={onClick}
    >
      <h3 className="text-sm font-medium text-gray-700 mb-4">Compliance Health Score</h3>
      
      {/* Circular Gauge */}
      <div className="relative flex items-center justify-center mb-4">
        <ResponsiveContainer width={200} height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              startAngle={180}
              endAngle={0}
              innerRadius={60}
              outerRadius={80}
              dataKey="value"
            >
              <Cell fill={color} />
              <Cell fill="#E5E7EB" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {/* Score overlay */}
        <div className="absolute text-center" style={{ top: '50%', transform: 'translateY(-20%)' }}>
          <div className="text-4xl font-bold" style={{ color }}>{score}</div>
          <div className="text-xs text-gray-500">out of 100</div>
        </div>
      </div>

      {/* Component Breakdown */}
      <div className="text-xs text-gray-600 space-y-1 mb-4">
        <div className="flex justify-between">
          <span>Deadline Adherence:</span>
          <span className="font-medium">{Math.round(components.deadlineAdherence)}</span>
        </div>
        <div className="flex justify-between">
          <span>Cost Predictability:</span>
          <span className="font-medium">{Math.round(components.costPredictability)}</span>
        </div>
        <div className="flex justify-between">
          <span>Risk Exposure:</span>
          <span className="font-medium">{Math.round(components.riskExposureInverse)}</span>
        </div>
      </div>

      {/* Trend Sparkline */}
      <ResponsiveContainer width="100%" height={60}>
        <LineChart data={trend}>
          <XAxis dataKey="month" hide />
          <YAxis hide domain={[0, 100]} />
          <Tooltip />
          <Line type="monotone" dataKey="score" stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>

      {/* Benchmark */}
      {industryBenchmark && (
        <div className="text-xs text-gray-600 mt-2">
          Industry Average: {industryBenchmark}
        </div>
      )}
    </div>
  )
}
