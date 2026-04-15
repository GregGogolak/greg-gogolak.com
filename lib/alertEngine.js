/**
 * Alert Engine — pure functions, no side effects.
 * Each function returns null (no alert) or an alert object.
 * Alert shape: { type, id, severity, color, message, detail }
 */

import { daysBetween } from './calculations'

const ICONS = {
  PRICE_DROP:        '⚡',
  CUSTOM_LEVEL:      '🎯',
  INTEREST_EROSION:  '💰',
  OIL_MOVE:          '🛢',
  EARNINGS_14D:      '📅',
  EARNINGS_3D:       '📅',
}

export function iconFor(type) {
  return ICONS[type] || '◉'
}

/**
 * 1. Price drop >2% in rolling 2hr window (or since open on cold start).
 *
 * priceData  — object from /api/price: { price, pctChange, ... }
 * priceBuffer — array of { price, ts } accumulated at 60s intervals
 */
export function checkPriceDropAlert(priceData, priceBuffer) {
  if (!priceData?.price) return null
  const current = priceData.price

  if (priceBuffer && priceBuffer.length >= 10) {
    // Use rolling window: find reading closest to 120 min ago
    const windowMs = 120 * 60 * 1000
    const cutoff   = Date.now() - windowMs
    const old      = priceBuffer.find(r => r.ts >= cutoff) || priceBuffer[0]
    if (!old) return null

    const pctDrop = (current - old.price) / old.price * 100
    if (pctDrop < -2.0) {
      return {
        type:     'PRICE_DROP',
        id:       'PRICE_DROP',
        severity: 'critical',
        color:    '#f87171',
        message:  `NVDA down ${Math.abs(pctDrop).toFixed(1)}% in 2hrs`,
        detail:   `From $${old.price.toFixed(2)} → $${current.toFixed(2)}`,
      }
    }
  } else {
    // Cold start: use pctChange from prev close as proxy
    const pct = parseFloat(priceData.pctChange)
    if (!isNaN(pct) && pct < -2.0) {
      return {
        type:     'PRICE_DROP',
        id:       'PRICE_DROP',
        severity: 'critical',
        color:    '#f87171',
        message:  `NVDA down ${Math.abs(pct).toFixed(1)}% today`,
        detail:   `Current $${current.toFixed(2)}`,
      }
    }
  }

  return null
}

/**
 * 2. Custom price level hit.
 *
 * currentPrice  — number
 * customLevels  — array of { id, price, direction: 'above'|'below', label }
 */
export function checkCustomLevelAlerts(currentPrice, customLevels) {
  if (!currentPrice || !Array.isArray(customLevels)) return []

  return customLevels
    .filter(level => {
      const lp = parseFloat(level.price)
      if (isNaN(lp)) return false
      if (level.direction === 'above') return currentPrice >= lp
      if (level.direction === 'below') return currentPrice <= lp
      return false
    })
    .map(level => ({
      type:     'CUSTOM_LEVEL',
      id:       `CUSTOM_LEVEL_${level.id}`,
      severity: 'warning',
      color:    '#fbbf24',
      message:  level.label || 'Price target hit',
      detail:   `$${parseFloat(level.price).toFixed(2)} ${level.direction}`,
    }))
}

/**
 * 3. Interest eroding >20% of gross profit on any open position.
 *
 * positions     — array from /api/positions
 * currentPrice  — number
 */
export function checkInterestErosionAlerts(positions, currentPrice) {
  if (!currentPrice || !Array.isArray(positions)) return []

  return positions
    .filter(pos => pos.status === 'OPEN' || !pos.status) // treat missing status as OPEN
    .reduce((acc, pos) => {
      const ep       = parseFloat(pos.entryPrice)
      const sh       = parseFloat(pos.shares)
      if (!ep || !sh || !pos.entryDate) return acc

      const daysHeld     = Math.max(1, daysBetween(pos.entryDate))
      const grossPnl     = (currentPrice - ep) * sh
      if (grossPnl <= 0) return acc // loss-side: skip

      const interestCost  = ep * sh * 0.000212 * daysHeld
      const erosionRatio  = interestCost / grossPnl

      if (erosionRatio > 0.20) {
        const pct = Math.round(erosionRatio * 100)
        acc.push({
          type:     'INTEREST_EROSION',
          id:       `INTEREST_EROSION_${pos.id || ep}`,
          severity: 'warning',
          color:    '#fbbf24',
          message:  `Interest eroding ${pct}% of profit`,
          detail:   `${sh.toLocaleString()} shares @ $${ep.toFixed(2)}`,
        })
      }
      return acc
    }, [])
}

/**
 * 4. Oil move >3% (single session or two-session).
 *
 * macroData — object from /api/macro: { oil: { price, pctChange, twoSessionPct } }
 */
export function checkOilMoveAlert(macroData) {
  const oil = macroData?.oil
  if (!oil?.price) return null

  const single = Math.abs(parseFloat(oil.pctChange) || 0)
  const two    = Math.abs(parseFloat(oil.twoSessionPct) || 0)

  if (single > 3 || two > 3) {
    const pct    = single > two ? single : two
    const dir    = (parseFloat(oil.pctChange) || 0) >= 0 ? 'up' : 'down'
    return {
      type:     'OIL_MOVE',
      id:       'OIL_MOVE',
      severity: 'warning',
      color:    '#fbbf24',
      message:  `Oil ${dir} ${pct.toFixed(1)}% — watch NVDA`,
      detail:   `Brent $${parseFloat(oil.price).toFixed(2)}`,
    }
  }
  return null
}

/**
 * 5. Earnings proximity warning.
 *
 * daysToEarnings — number (integer days until earnings)
 */
export function checkEarningsAlert(daysToEarnings) {
  if (daysToEarnings <= 3 && daysToEarnings > 0) {
    return {
      type:     'EARNINGS_3D',
      id:       'EARNINGS_3D',
      severity: 'warning',
      color:    '#fbbf24',
      message:  `Earnings in ${daysToEarnings} day${daysToEarnings === 1 ? '' : 's'} — final warning`,
      detail:   'May 20, 2026 — EPS est. $1.76',
    }
  }
  if (daysToEarnings <= 14 && daysToEarnings > 3) {
    return {
      type:     'EARNINGS_14D',
      id:       'EARNINGS_14D',
      severity: 'info',
      color:    '#5b9cf6',
      message:  `Earnings in ${daysToEarnings} days`,
      detail:   'May 20, 2026 — EPS est. $1.76',
    }
  }
  return null
}
