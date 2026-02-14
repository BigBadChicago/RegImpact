interface DeadlineCountdownProps {
  daysRemaining: number
}

function getTone(daysRemaining: number): { label: string; color: string } {
  if (daysRemaining < 0) {
    return { label: 'Overdue', color: 'var(--ui-danger)' }
  }
  if (daysRemaining <= 30) {
    return { label: 'Critical', color: 'var(--ui-danger)' }
  }
  if (daysRemaining <= 60) {
    return { label: 'Important', color: 'var(--ui-warn)' }
  }
  return { label: 'Routine', color: 'var(--ui-ok)' }
}

export default function DeadlineCountdown({ daysRemaining }: DeadlineCountdownProps) {
  const tone = getTone(daysRemaining)
  const clamped = Math.min(Math.max(daysRemaining, 0), 120)
  const progress = 100 - Math.round((clamped / 120) * 100)
  const label =
    daysRemaining < 0
      ? `Overdue by ${Math.abs(daysRemaining)} days`
      : `${daysRemaining} days remaining`

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold">{label}</span>
      <div className="h-2 w-full rounded-full bg-[var(--ui-border)]">
        <div
          className="h-2 rounded-full transition-all"
          style={{ width: `${progress}%`, backgroundColor: tone.color }}
        />
      </div>
      <span className="text-xs uppercase tracking-[0.2em] text-muted">
        {tone.label}
      </span>
    </div>
  )
}
