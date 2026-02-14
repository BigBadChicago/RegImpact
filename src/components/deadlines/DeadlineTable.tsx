import Link from 'next/link'
import type { DeadlineWithDaysRemaining } from '@/types/deadline'
import { formatDate } from '@/lib/utils/format'
import RiskBadge from './RiskBadge'
import DeadlineCountdown from './DeadlineCountdown'

export type SortDirection = 'asc' | 'desc'

interface DeadlineTableProps {
  deadlines: DeadlineWithDaysRemaining[]
  sortDirection: SortDirection
  onSortByDate: () => void
}

export default function DeadlineTable({
  deadlines,
  sortDirection,
  onSortByDate,
}: DeadlineTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0">
        <thead>
          <tr className="text-left text-xs uppercase tracking-[0.3em] text-muted">
            <th className="px-6 py-4 font-semibold">Regulation</th>
            <th
              className="px-6 py-4 font-semibold cursor-pointer select-none"
              onClick={onSortByDate}
            >
              <div className="flex items-center gap-2">
                Deadline Date
                <span className="text-[10px]">
                  {sortDirection === 'asc' ? '▲' : '▼'}
                </span>
              </div>
            </th>
            <th className="px-6 py-4 font-semibold">Days Remaining</th>
            <th className="px-6 py-4 font-semibold">Risk Level</th>
          </tr>
        </thead>
        <tbody>
          {deadlines.map((deadline) => (
            <tr
              key={deadline.id}
              className="border-t border-[var(--ui-border)] hover:bg-white/70 transition-colors"
            >
              <td className="px-6 py-4">
                <Link
                  href={`/dashboard/regulations/${deadline.regulationVersion.regulation.id}`}
                  className="text-[var(--ui-accent-3)] font-semibold hover:underline"
                >
                  {deadline.regulationVersion.regulation.title}
                </Link>
                <p className="text-sm text-muted mt-2">
                  {deadline.description}
                </p>
              </td>
              <td className="px-6 py-4 font-semibold">
                {formatDate(deadline.deadlineDate)}
              </td>
              <td className="px-6 py-4 min-w-[220px]">
                <DeadlineCountdown daysRemaining={deadline.daysRemaining} />
              </td>
              <td className="px-6 py-4">
                <RiskBadge level={deadline.riskLevel} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
