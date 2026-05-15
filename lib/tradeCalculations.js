/**
 * Pure trade P&L calculation functions — no side effects, no API calls.
 * Implements the exact formula from TRACK_PLAN.md.
 */

/**
 * Returns calendar days between two date strings, exclusive of both endpoints.
 * e.g. Mon → Mon = 0 days, Mon → Tue = 1 day, Mon → Wed = 2 days
 */
export function daysBetweenExclusive(dateA, dateB) {
  const a = new Date(dateA)
  const b = new Date(dateB)
  const diffMs = Math.abs(b - a)
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * Calculates all P&L fields for a closed trade.
 *
 * Platform fee rule:
 *   Only buy day and sell day are charged ($48 each day with an executed trade).
 *   Days in between are NOT charged.
 *   Same-day trade = 1 day = $48
 *   Different days  = 2 days = $96 (regardless of hold length)
 *
 * @param {string[]} existingDatesForUser - dates already charged a platform fee
 *   for this user in the current import/calculation batch. Dates in this array
 *   are skipped (fee = $0). Defaults to [] — backwards compatible.
 */
export function calculateTrade({
  buy_price, sell_price, shares, buy_date, sell_date, type,
  existingDatesForUser = [],
}) {
  const gross_pnl        = (sell_price - buy_price) * shares
  const transaction_fees = (buy_price * shares * 0.001) + (sell_price * shares * 0.001)
  const interest_days    = daysBetweenExclusive(buy_date, sell_date)
  const interest_cost    = buy_price * shares * 0.000212 * interest_days

  // Platform fee — $48 per unique calendar day, but only if not already charged
  const buyDayAlreadyCharged  = existingDatesForUser.includes(buy_date)
  const sellDayAlreadyCharged = existingDatesForUser.includes(sell_date)
  const buyDayFee  = buyDayAlreadyCharged ? 0 : 48
  const sellDayFee = (buy_date === sell_date || sellDayAlreadyCharged) ? 0 : 48
  const platform_fees     = buyDayFee + sellDayFee
  const platform_fee_days = (buyDayFee > 0 ? 1 : 0) + (sellDayFee > 0 ? 1 : 0)

  const total_costs      = transaction_fees + platform_fees + interest_cost
  const net_before_split = gross_pnl - total_costs
  const after_split      = net_before_split * 0.50
  const after_tax        = after_split * 0.90
  const net_eur          = after_tax * 0.90

  return {
    gross_pnl_usd:        gross_pnl,
    transaction_fees_usd: transaction_fees,
    platform_fees_usd:    platform_fees,
    platform_fee_days,
    interest_usd:         interest_cost,
    total_costs_usd:      total_costs,
    net_before_split_usd: net_before_split,
    after_split_usd:      after_split,
    after_tax_usd:        after_tax,
    net_eur,
    interest_days,
    calendar_days:        interest_days,
  }
}

/**
 * Calculates the shared platform fee for a trade given the cross-user date map.
 * If no dateMap is provided, returns the original $96/day amounts.
 */
export function calculateSharedPlatformFee(trade, dateMap) {
  if (!dateMap) return {
    buyDayFee: 48,
    sellDayFee: trade.buy_date !== trade.sell_date ? 48 : 0,
    totalPlatformFee: trade.buy_date !== trade.sell_date ? 96 : 48,
    buyDaySharedWith: [],
    sellDaySharedWith: [],
    isSameDay: trade.buy_date === trade.sell_date,
  }

  const buyEntry = dateMap[trade.buy_date]
  const sellEntry = trade.sell_date !== trade.buy_date
    ? dateMap[trade.sell_date]
    : null

  const buyUsers = buyEntry?.totalUsers ?? 1
  const sellUsers = sellEntry?.totalUsers ?? 1
  const isSameDay = trade.buy_date === trade.sell_date

  const buyDayFee = 48 / buyUsers
  const sellDayFee = isSameDay ? 0 : 48 / sellUsers
  const totalPlatformFee = buyDayFee + sellDayFee

  return {
    buyDayFee,
    sellDayFee,
    totalPlatformFee,
    buyDaySharedWith: buyEntry?.sharedWith ?? [],
    sellDaySharedWith: sellEntry?.sharedWith ?? [],
    isSameDay,
    buyUsers,
    sellUsers,
  }
}

/**
 * Recalculates net EUR for a trade using the adjusted (shared) platform fee.
 * Does not mutate stored trade data — purely visual recalculation.
 */
export function recalculateNetWithSharedFees(trade, sharedFees) {
  const originalPlatformFee = trade.platform_fees_usd ?? (trade.buy_date !== trade.sell_date ? 96 : 48)
  const platformSaving = originalPlatformFee - sharedFees.totalPlatformFee

  const adjustedNetBeforeSplit = (trade.net_before_split_usd ?? 0) + platformSaving
  const afterSplit = adjustedNetBeforeSplit * 0.50
  const afterTax = afterSplit * 0.90
  const adjustedNetEur = afterTax * 0.90

  return {
    adjustedNetEur,
    platformSaving,
    adjustedPlatformFee: sharedFees.totalPlatformFee,
  }
}
