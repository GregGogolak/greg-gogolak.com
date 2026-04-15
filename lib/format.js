/**
 * Shared formatters for the Track page (SummaryCards + TradeTable).
 */

export function fmtUSD(n) {
  if (n == null || !Number.isFinite(n)) return '—'
  const abs = Math.abs(n)
  const str = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return (n < 0 ? '-$' : '$') + str
}

export function fmtEUR(n) {
  if (n == null || !Number.isFinite(n)) return '—'
  const abs = Math.abs(n)
  const str = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return (n < 0 ? '-€' : '€') + str
}

export function pnlColor(n) {
  if (n == null || !Number.isFinite(n)) return '#8892a8'
  return n >= 0 ? '#34d399' : '#f87171'
}
