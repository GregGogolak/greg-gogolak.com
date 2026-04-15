/**
 * Pure calculation utilities — no side effects, no API calls.
 */

/** Rolling simple moving average from an array of closing prices */
export function sma(closes, period) {
  if (!closes || closes.length < period) return null
  return closes.slice(-period).reduce((a, b) => a + b, 0) / period
}

/** Days between two dates (calendar days) */
export function daysBetween(from, to = new Date()) {
  return Math.ceil((new Date(to) - new Date(from)) / 86_400_000)
}

/** Days until a future date */
export function daysUntil(targetDateStr) {
  return Math.max(0, Math.ceil((new Date(targetDateStr) - new Date()) / 86_400_000))
}

/**
 * Net P&L after all costs, converted to EUR.
 * Exact formula from CLAUDE.md.
 */
export function calcNetPnl({ entryPrice, currentPrice, shares, entryDate }) {
  const daysHeld     = Math.max(1, daysBetween(entryDate))
  const gross        = (currentPrice - entryPrice) * shares
  const fees         = (entryPrice * shares * 0.001) + (currentPrice * shares * 0.001)
  const interest     = entryPrice * shares * 0.000212 * daysHeld
  const afterFees    = gross - fees - interest
  const afterSplit   = afterFees * 0.50
  const afterTax     = afterSplit * 0.90
  const netEur       = afterTax * 0.90
  return { gross, fees, interest, afterFees, netEur, daysHeld }
}

/** Format a number as USD price string */
export function fmtPrice(n) {
  if (n == null) return '—'
  return '$' + Number(n).toFixed(2)
}

/** Format % with sign */
export function fmtPct(n, decimals = 2) {
  if (n == null) return '—'
  const sign = n >= 0 ? '+' : ''
  return `${sign}${Number(n).toFixed(decimals)}%`
}

/** Format a number as EUR string (integer, e.g. €1,234) */
export function fmtEur(n) {
  if (n == null) return '—'
  const sign = n >= 0 ? '+' : '-'
  return `${sign}€${Math.abs(Math.round(n)).toLocaleString('en-US')}`
}

/**
 * Projected P&L at a specific daysHeld value.
 * Same formula as calcNetPnl but takes daysHeld directly
 * so projections at Day 1 / 7 / 14 / 30 don't require mocked dates.
 */
export function calcProjectedPnl({ entryPrice, exitPrice, shares, daysHeld }) {
  const gross      = (exitPrice - entryPrice) * shares
  const fees       = (entryPrice * shares * 0.001) + (exitPrice * shares * 0.001)
  const interest   = entryPrice * shares * 0.000212 * daysHeld
  const afterFees  = gross - fees - interest
  const afterSplit = afterFees * 0.50
  const afterTax   = afterSplit * 0.90
  const netEur     = afterTax * 0.90
  return { gross, fees, interest, afterFees, afterSplit, afterTax, netEur, daysHeld }
}

/**
 * Calendar day at which cumulative interest equals erosionPct of
 * net-before-interest profit. Returns null if the trade is already loss-side.
 * Default: 20% erosion.
 */
export function calcInterestErosionDay(entryPrice, targetPrice, shares, erosionPct = 0.20) {
  const gross             = (targetPrice - entryPrice) * shares
  const fees              = (entryPrice * shares * 0.001) + (targetPrice * shares * 0.001)
  const netBeforeInterest = gross - fees
  if (netBeforeInterest <= 0) return null
  const interestPerDay    = entryPrice * shares * 0.000212
  return Math.floor((erosionPct * netBeforeInterest) / interestPerDay)
}
