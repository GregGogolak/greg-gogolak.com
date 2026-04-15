/**
 * Pure trade P&L calculation functions — no side effects, no API calls.
 * Implements the exact formula from TRACK_PLAN.md.
 */

/**
 * Returns calendar days between two date strings, inclusive on both ends.
 * e.g. Mon → Wed = 3 days
 */
export function daysBetweenInclusive(dateA, dateB) {
  const a = new Date(dateA)
  const b = new Date(dateB)
  const diffMs = Math.abs(b - a)
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  return diffDays + 1
}

/**
 * Calculates all P&L fields for a closed trade.
 *
 * Platform fee rule:
 *   Only buy day and sell day are charged ($96 each day with an executed trade).
 *   Days in between are NOT charged.
 *   Same-day trade = 1 day = $96
 *   Different days  = 2 days = $192 (regardless of hold length)
 */
export function calculateTrade({ buy_price, sell_price, shares, buy_date, sell_date }) {
  const gross_pnl        = (sell_price - buy_price) * shares
  const transaction_fees = (buy_price * shares * 0.001) + (sell_price * shares * 0.001)
  const platform_fee_days = (buy_date === sell_date) ? 1 : 2
  const platform_fees    = platform_fee_days * 96
  const calendar_days    = daysBetweenInclusive(buy_date, sell_date)
  const interest_cost    = buy_price * shares * 0.000212 * calendar_days
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
    calendar_days,
  }
}
