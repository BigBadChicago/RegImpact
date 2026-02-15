'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import HealthScoreGaugeNew from '@/components/dashboard/HealthScoreGaugeNew'
import CostWaterfall from '@/components/dashboard/CostWaterfall'
import RegulatoryTimeline from '@/components/dashboard/RegulatoryTimeline'
import { generateDashboardPDF } from '@/lib/export/pdf-export'
import { DashboardMetrics, HealthScoreComponents, WaterfallDataPoint, TimelineEvent } from '@/types/dashboard'

interface MetricsResponse {
  healthScore: number
  healthTrend: number
  totalCostExposure: number
  costTrend: number
  regulationCount: number
  upcomingDeadlines: number
  components: HealthScoreComponents
}

type TimePeriod = 'month' | 'quarter' | 'year'

export default function ExecutiveDashboard() {
  const router = useRouter()
  const [data, setData] = useState<MetricsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('month')

  useEffect(() => {
    fetchMetrics()
  }, [timePeriod])

  async function fetchMetrics() {
    try {
      setLoading(true)
      const res = await fetch(`/api/dashboard/metrics?period=${timePeriod}`)

      if (res.status === 401) {
        router.push('/login')
        return
      }

      if (!res.ok) {
        throw new Error('Failed to fetch metrics')
      }

      const metrics: MetricsResponse = await res.json()
      setData(metrics)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  async function handleDownloadPDF() {
    if (!data) return

    try {
      setGeneratingPDF(true)
      const pdf = await generateDashboardPDF(
        '', // customerId (not needed for PDF generation)
        'Company Name', // TODO: Fetch from session or API
        data.healthScore,
        data.healthTrend,
        data.totalCostExposure,
        data.costTrend,
        data.regulationCount,
        data.upcomingDeadlines
      )

      const url = URL.createObjectURL(pdf)
      const a = document.createElement('a')
      a.href = url
      a.download = `compliance-dashboard-${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error generating PDF:', err)
      alert('Failed to generate PDF. Please try again.')
    } finally {
      setGeneratingPDF(false)
    }
  }

  async function handleRefresh() {
    await fetchMetrics()
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading dashboard...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium mb-2">Error Loading Dashboard</h3>
          <p className="text-red-700 text-sm">{error}</p>
          <button
            onClick={handleRefresh}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center text-gray-500">No data available</div>
      </div>
    )
  }

  // Transform waterfall data
  const waterfallData: WaterfallDataPoint[] = [
    {
      label: 'Current Exposure',
      value: data.totalCostExposure,
      type: 'start',
      color: '#3b82f6'
    },
    {
      label: 'New Regulations',
      value: data.totalCostExposure * 0.15, // Mock: 15% increase
      type: 'increase',
      color: '#ef4444'
    },
    {
      label: 'Mitigated Costs',
      value: data.totalCostExposure * 0.05, // Mock: 5% decrease
      type: 'decrease',
      color: '#10b981'
    },
    {
      label: 'Projected Exposure',
      value: data.totalCostExposure * 1.1, // Mock: 10% net increase
      type: 'end',
      color: '#3b82f6'
    }
  ]

  // Transform timeline data (mock)
  const timelineEvents: TimelineEvent[] = Array.from({ length: data.upcomingDeadlines }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() + i * 2)

    const statuses: ('upcoming' | 'due-soon' | 'overdue')[] = ['upcoming', 'due-soon', 'overdue']
    const types: ('effective' | 'compliance' | 'filing')[] = ['effective', 'compliance', 'filing']

    return {
      date,
      regulation: {
        id: `reg-${i}`,
        title: `Regulation ${i + 1}`
      },
      type: types[i % types.length],
      status: statuses[i % statuses.length]
    }
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Executive Dashboard</h1>
              <p className="mt-2 text-gray-600">Compliance metrics and regulatory timeline</p>
            </div>
            <div className="flex gap-3 items-center">
              {/* Time Period Selector */}
              <div className="flex gap-2">
                {(['month', 'quarter', 'year'] as TimePeriod[]).map((period) => (
                  <button
                    key={period}
                    onClick={() => setTimePeriod(period)}
                    className={`px-4 py-2 rounded-md font-medium transition-colors ${
                      timePeriod === period
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {period.charAt(0).toUpperCase() + period.slice(1)}
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors font-medium"
                disabled={loading}
              >
                Refresh
              </button>
              <button
                onClick={handleDownloadPDF}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                disabled={generatingPDF}
              >
                {generatingPDF ? 'Generating...' : 'Export PDF'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Row 1: Metric Cards (4 columns) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Health Score Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Health Score</h3>
            <div className="mt-4 flex items-baseline gap-2">
              <span
                className={`text-4xl font-bold ${
                  data.healthScore < 60
                    ? 'text-red-600'
                    : data.healthScore < 80
                      ? 'text-yellow-600'
                      : 'text-green-600'
                }`}
              >
                {data.healthScore}
              </span>
              <span className="text-sm text-gray-500">/100</span>
            </div>
            <p
              className={`mt-2 text-sm font-medium ${
                data.healthTrend > 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {data.healthTrend > 0 ? '+' : ''}{data.healthTrend.toFixed(1)}% vs last period
            </p>
          </div>

          {/* Cost Exposure Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Cost Exposure</h3>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">
                ${(data.totalCostExposure / 1000000).toFixed(2)}
              </span>
              <span className="text-sm text-gray-500">M</span>
            </div>
            <p
              className={`mt-2 text-sm font-medium ${
                data.costTrend > 0 ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {data.costTrend > 0 ? '+' : ''}{data.costTrend.toFixed(1)}% vs last period
            </p>
          </div>

          {/* Regulations Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Regulations</h3>
            <div className="mt-4">
              <span className="text-4xl font-bold text-gray-900">{data.regulationCount}</span>
            </div>
            <p className="mt-2 text-sm text-gray-600">Active regulations tracked</p>
          </div>

          {/* Deadlines Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Deadlines</h3>
            <div className="mt-4">
              <span className="text-4xl font-bold text-gray-900">{data.upcomingDeadlines}</span>
            </div>
            <p className="mt-2 text-sm text-gray-600">Coming in next 30 days</p>
          </div>
        </div>

        {/* Row 2: Health Gauge and Waterfall (2 columns) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <HealthScoreGaugeNew
            score={data.healthScore}
            trend={data.healthTrend}
            components={data.components}
          />
          <CostWaterfall data={waterfallData} />
        </div>

        {/* Row 3: Timeline (full width) */}
        <div className="mb-8">
          <RegulatoryTimeline events={timelineEvents} />
        </div>

        {/* Footer Note */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
          <p>
            <strong>Note:</strong> Dashboard data is updated daily. For real-time updates or to request additional metrics,
            please contact your compliance administrator.
          </p>
        </div>
      </div>
    </div>
  )
}
