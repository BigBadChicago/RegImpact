/**
 * Formatting Utilities
 * Helper functions for formatting dates, currency, percentages, and text
 */

/**
 * Format date to readable string
 * @param date - Date to format
 * @returns Formatted date string (e.g., "Jan 15, 2025")
 */
export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(dateObj);
}

/**
 * Format currency value
 * @param amount - Amount in dollars
 * @returns Formatted currency string (e.g., "$150,000")
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format percentage value
 * @param value - Value as decimal (0.235 = 23.5%)
 * @returns Formatted percentage string (e.g., "23.5%")
 */
export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Truncate text with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with "..." if exceeds maxLength
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.substring(0, maxLength)}...`;
}

/**
 * Format large numbers with commas
 * @param num - Number to format
 * @returns Formatted number string (e.g., "1,234,567")
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}
