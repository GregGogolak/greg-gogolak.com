/**
 * Assembles all live trading data into a structured Claude prompt string.
 * Used exclusively by /api/analysis.
 *
 * @param {object} params
 * @param {object} params.price         - from /api/price: { price, pctChange, pctFrom200, pctFrom50, pctBelowHigh, volumeRatio }
 * @param {object} params.macro         - from /api/macro: { oil: { price, pctChange, twoSessionPct }, qqq: { pctChange }, vix: { level } }
 * @param {Array}  params.news          - classified articles: [{ bucket, headline, source }]
 * @param {Array}  params.positions     - open positions: [{ type, shares, entryPrice, entryDate }]
 * @param {object} params.fundamentals  - { analystTarget, targetGapPct, daysToEarnings, daysToFomc }
 * @returns {string}
 */
export function formatBrief({ price, macro, news, positions, fundamentals }) {
  const sign = n => (n == null ? '?' : (n >= 0 ? '+' : '') + Number(n).toFixed(2))

  const newsSection = !news?.length
    ? 'No recent news.'
    : news.map(a => `[${a.bucket}] ${a.headline} (${a.source})`).join('\n')

  const positionsSection = !positions?.length
    ? 'None'
    : positions.map(p => {
        const daysHeld = p.entryDate
          ? Math.max(0, Math.floor((Date.now() - new Date(p.entryDate).getTime()) / 86_400_000))
          : '?'
        const grossPnl = price.price && p.entryPrice && p.shares
          ? (price.price - Number(p.entryPrice)) * Number(p.shares)
          : null
        const pnlStr = grossPnl != null ? `$${grossPnl.toFixed(0)}` : 'n/a'
        return `${p.type} — ${p.shares} shares @ $${Number(p.entryPrice).toFixed(2)}, held ${daysHeld}d, gross P&L: ${pnlStr}`
      }).join('\n')

  return `NVDA TRADING BRIEF

PRICE:
- Current: $${Number(price.price).toFixed(2)} (${sign(price.pctChange)}% vs prev close)
- Distance from 200 SMA: ${sign(price.pctFrom200)}%
- Distance from 50 SMA: ${sign(price.pctFrom50)}%
- % below 10-day high: ${sign(price.pctBelowHigh)}%
- Volume vs 30d avg: ${Number(price.volumeRatio).toFixed(2)}x

FUNDAMENTALS:
- Analyst consensus target: $${fundamentals.analystTarget} (${sign(fundamentals.targetGapPct)}% above current)
- Days to earnings (May 20 2026, EPS est. $1.76, rev $78.42B): ${fundamentals.daysToEarnings}
- Days to FOMC (Apr 28-29 2026): ${fundamentals.daysToFomc}

MACRO:
- Brent crude: ${macro.oil ? `$${Number(macro.oil.price).toFixed(2)} (${sign(macro.oil.pctChange)}% today, ${sign(macro.oil.twoSessionPct)}% 2-session)` : 'unavailable'}
- QQQ: ${macro.qqq ? `${sign(macro.qqq.pctChange)}%` : 'unavailable'} today
- VIX: ${macro.vix ? Number(macro.vix.level).toFixed(1) : 'unavailable'}

NEWS (last 48hrs — A=Noise B=Support C=Risk):
${newsSection}

OPEN POSITIONS:
${positionsSection}`
}
