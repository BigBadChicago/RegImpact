import type { RiskLevel } from '@/types/deadline'

const riskStyles: Record<RiskLevel, string> = {
  CRITICAL: 'bg-[var(--ui-danger)] text-white',
  IMPORTANT: 'bg-[var(--ui-warn)] text-[#3b2f0b]',
  ROUTINE: 'bg-[var(--ui-ok)] text-white',
}

interface RiskBadgeProps {
  level: RiskLevel
}

export default function RiskBadge({ level }: RiskBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
        riskStyles[level]
      }`}
    >
      {level}
    </span>
  )
}
