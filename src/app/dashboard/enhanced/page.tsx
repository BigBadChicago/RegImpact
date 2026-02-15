'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import HealthScoreGauge from '@/components/dashboard/HealthScoreGauge'
import CostWaterfallChart from '@/components/dashboard/CostWaterfallChart'
import RegulatoryTimelineChart from '@/components/dashboard/RegulatoryTimelineChart'
import { generateBoardPDF } from '@/lib/export/board-pdf'
import { EnhancedDashboardData } from '@/types/dashboard-enhanced'

export default function EnhancedDashboard() {
  const router = useRouter()
  const [data, setData] = useState<EnhancedDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generatingPDF, setGeneratingPDF] = useState(false)

  useEffect(() => {
    fetchDashboardData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchDashboardData() {
    try {
      setLoading(true)
      const res = await fetch('/api/dashboard-enhanced')
      
      if (res.status === 401) {
        router.push('/login')
        return
      }
      
      if (!res.ok) {
        throw new Error('Failed to fetch dashboard data')
      }
      
      const dashboardData = await res.json()
      setData(dashboardData)
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
      const pdf = await generateBoardPDF(
        data.healthScore,
        data.costWaterfall,
        data.timelineRegulations
      )
      
      const url = URL.createObjectURL(pdf)
      const a = document.createElement('a')
      a.href = url
      a.download = `compliance-board-report-${new Date().toISOString().split('T')[0]}.pdf`
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

  function handleRegulationClick(regulationId: string) {
    router.push(`/regulations/${regulationId}`)
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
            onClick={fetchDashboardData}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
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
        <div className="text-gray-500">No data available</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header with PDF Export */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Compliance Dashboard</h1>
          <p className="text-gray-600 text-sm mt-1">Executive overview of regulatory compliance status</p>
        </div>
        <button
          onClick={handleDownloadPDF}
          disabled={generatingPDF}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {generatingPDF ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Generating...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download Board Report
            </>
          )}
        </button>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Health Score - Takes 1 column */}
        <div className="lg:col-span-1">
          <HealthScoreGauge 
            healthScore={data.healthScore} 
            onClick={() => {
              // Future: Open detail modal
              console.log('Health score clicked')
            }}
          />
        </div>
        
        {/* Cost Waterfall - Takes 2 columns */}
        <div className="lg:col-span-2">
          <CostWaterfallChart 
            data={data.costWaterfall} 
            onBarClick={handleRegulationClick}
          />
        </div>
      </div>

      {/* Timeline - Full width */}
      <RegulatoryTimelineChart 
        regulations={data.timelineRegulations} 
        onRegulationClick={handleRegulationClick}
      />

      {/* Data Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Total Regulations</div>
          <div className="text-2xl font-bold text-gray-900">{data.timelineRegulations.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Critical Deadlines</div>
          <div className="text-2xl font-bold text-red-600">
            {data.timelineRegulations.filter(r => r.riskLevel === 'CRITICAL').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Total Exposure</div>
          <div className="text-2xl font-bold text-gray-900">
            {new Intl.NumberFormat('en-US', { 
              style: 'currency', 
              currency: 'USD',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            }).format(data.costWaterfall.starting)}
          </div>
        </div>
      </div>
    </div>
  )
}
