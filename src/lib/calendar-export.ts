import type { DeadlineWithDaysRemaining } from '@/types/deadline'

function pad(value: number): string {
  return value.toString().padStart(2, '0')
}

function formatDateOnly(dateInput: Date | string): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`
}

function formatDateTimeUTC(dateInput: Date | string): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  const year = date.getUTCFullYear()
  const month = pad(date.getUTCMonth() + 1)
  const day = pad(date.getUTCDate())
  const hours = pad(date.getUTCHours())
  const minutes = pad(date.getUTCMinutes())
  const seconds = pad(date.getUTCSeconds())
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

export function buildDeadlineCalendar(deadlines: DeadlineWithDaysRemaining[]): string {
  const nowStamp = formatDateTimeUTC(new Date())
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//RegImpact//Deadlines//EN',
    'CALSCALE:GREGORIAN',
  ]

  deadlines.forEach((deadline) => {
    const title = deadline.regulationVersion.regulation.title
    const description = `${deadline.description}\nRisk: ${deadline.riskLevel}\nJurisdiction: ${deadline.regulationVersion.regulation.jurisdiction.name}`
    const uid = `${deadline.id}@regimpact`

    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${uid}`)
    lines.push(`DTSTAMP:${nowStamp}`)
    lines.push(`DTSTART;VALUE=DATE:${formatDateOnly(deadline.deadlineDate)}`)
    lines.push(`SUMMARY:${escapeIcsText(title)}`)
    lines.push(`DESCRIPTION:${escapeIcsText(description)}`)
    lines.push('BEGIN:VALARM')
    lines.push('TRIGGER:-P7D')
    lines.push('ACTION:DISPLAY')
    lines.push('DESCRIPTION:Deadline reminder')
    lines.push('END:VALARM')
    lines.push('END:VEVENT')
  })

  lines.push('END:VCALENDAR')

  return `${lines.join('\r\n')}\r\n`
}

export function downloadCalendarFile(content: string, filename = 'deadlines.ics'): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
