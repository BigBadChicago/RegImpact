/**
 * Shared PDF formatting utilities
 */

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export const getScoreColor = (score: number): [number, number, number] => {
  if (score < 60) return [220, 38, 38]   // Red
  if (score < 80) return [245, 158, 11]  // Yellow
  return [16, 185, 129]                   // Green
}
