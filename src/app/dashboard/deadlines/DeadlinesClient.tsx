"use client"

import { useEffect, useMemo, useState } from 'react'
import type {
  DeadlineListResponse,
  DeadlineWithDaysRemaining,
  RiskLevel,
} from '@/types/deadline'
import DeadlineTable, { SortDirection } from '@/components/deadlines/DeadlineTable'
import { buildDeadlineCalendar, downloadCalendarFile } from '@/lib/calendar-export'

interface DeadlinesClientProps {
  customerId: string
}

type RiskFilter = 'ALL' | RiskLevel

export default function DeadlinesClient({ customerId }: DeadlinesClientProps) {
  const [deadlines, setDeadlines] = useState<DeadlineWithDaysRemaining[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [riskLevel, setRiskLevel] = useState<RiskFilter>('ALL')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [stats, setStats] = useState({
    totalCount: 0,
    criticalCount: 0,
    importantCount: 0,
    routineCount: 0,
  })

  useEffect(() => {
    const loadDeadlines = async () => {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          customerId,
          daysAhead: '180',
        })

        if (riskLevel !== 'ALL') {
          params.set('riskLevel', riskLevel)
        }

        const response = await fetch(`/api/deadlines?${params.toString()}`, {
          cache: 'no-store',
        })

        if (!response.ok) {
          throw new Error('Failed to load deadlines')
        }

        const data: DeadlineListResponse = await response.json()
        setDeadlines(data.deadlines)
        setStats({
          totalCount: data.totalCount,
          criticalCount: data.criticalCount,
          importantCount: data.importantCount,
          routineCount: data.routineCount,
        })
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    void loadDeadlines()
  }, [customerId, riskLevel])

  const sortedDeadlines = useMemo(() => {
    const items = [...deadlines]
    items.sort((a, b) => {
      const diff = new Date(a.deadlineDate).getTime() - new Date(b.deadlineDate).getTime()
      return sortDirection === 'asc' ? diff : -diff
    })
    return items
  }, [deadlines, sortDirection])

  const derivedStats = useMemo(() => {
    const now = 0
    const overdueCount = sortedDeadlines.filter((item) => item.daysRemaining < 0).length
    const thisWeekCount = sortedDeadlines.filter(
      (item) => item.daysRemaining >= now && item.daysRemaining <= 7
    ).length

    return { overdueCount, thisWeekCount }
  }, [sortedDeadlines])

  const handleSortByDate = () => {
    setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
  }

  const handleExport = () => {
    const content = buildDeadlineCalendar(sortedDeadlines)
    downloadCalendarFile(content)
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="app-card-strong p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Total Deadlines</p>
          <p className="mt-3 text-3xl font-display">{stats.totalCount}</p>
        </div>
        <div className="app-card-strong p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Critical Deadlines</p>
          <p className="mt-3 text-3xl font-display text-[var(--ui-danger)]">
            {stats.criticalCount}
          </p>
        </div>
        <div className="app-card-strong p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Due This Week</p>
          <p className="mt-3 text-3xl font-display">{derivedStats.thisWeekCount}</p>
        </div>
        <div className="app-card-strong p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Overdue</p>
          <p className="mt-3 text-3xl font-display">{derivedStats.overdueCount}</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-semibold">Risk filter</label>
          <select
            name="riskLevel"
            className="rounded-full border border-[var(--ui-border)] bg-white px-4 py-2 text-sm font-semibold"
            value={riskLevel}
            onChange={(event) => setRiskLevel(event.target.value as RiskFilter)}
          >
            <option value="ALL">ALL</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="IMPORTANT">IMPORTANT</option>
            <option value="ROUTINE">ROUTINE</option>
          </select>
        </div>
        <button
          type="button"
          onClick={handleExport}
          className="rounded-full bg-[var(--ui-accent)] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
        >
          Export to Calendar
        </button>
      </div>

      {loading ? (
        <div data-testid="loading" className="app-card p-10 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-muted">Loading</p>
          <p className="mt-4 text-2xl font-display">Preparing deadline board...</p>
        </div>
      ) : error ? (
        <div className="app-card p-10 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-muted">Something went wrong</p>
          <p className="mt-4 text-lg font-semibold">{error}</p>
        </div>
      ) : sortedDeadlines.length === 0 ? (
        <div className="app-card p-10 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-muted">No deadlines found</p>
          <p className="mt-4 text-lg">No upcoming deadlines match this filter.</p>
        </div>
      ) : (
        <div className="app-card-strong p-0">
          <DeadlineTable
            deadlines={sortedDeadlines}
            sortDirection={sortDirection}
            onSortByDate={handleSortByDate}
          />
        </div>
      )}
    </div>
  )
}
