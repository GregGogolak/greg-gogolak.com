/**
 * Thesis status logic — pure function, no side effects.
 *
 * BROKEN   → price > 5% below 200 SMA (sustained)
 * AT RISK  → any one of: within 2% below 200 SMA | oil +5% in 2 sessions | VIX > 30 | Bucket C news
 * INTACT   → none of the above + price above 200 SMA + consensus > 20% above price
 */

export function getThesisStatus({ price, sma200, oilTwoSessionPct = 0, vix = 0, hasBucketCNews = false }) {
  if (!price || !sma200) return { status: 'UNKNOWN', triggers: [] }

  const pctFromSma200 = ((price - sma200) / sma200) * 100

  // BROKEN
  if (pctFromSma200 < -5) {
    return { status: 'BROKEN', triggers: [`Price ${pctFromSma200.toFixed(1)}% below 200 SMA`] }
  }

  // AT RISK — collect all triggers
  const triggers = []
  if (pctFromSma200 < 0 && pctFromSma200 > -5) triggers.push(`Price ${Math.abs(pctFromSma200).toFixed(1)}% below 200 SMA`)
  if (oilTwoSessionPct > 5)  triggers.push(`Oil +${oilTwoSessionPct.toFixed(1)}% over 2 sessions`)
  if (vix > 30)              triggers.push(`VIX ${vix.toFixed(1)} above 30`)
  if (hasBucketCNews)        triggers.push('Bucket C news detected')

  if (triggers.length > 0) return { status: 'AT RISK', triggers }

  return { status: 'INTACT', triggers: [] }
}

/**
 * Buy checklist — returns array of { label, pass, value } objects.
 * 6 conditions from CLAUDE.md.
 */
export function getBuyChecklist({ price, sma200, analystTarget, hasBucketCNews = false, qqqPctChange = 0, vix = 0, daysToEarnings = 999 }) {
  const pctFromSma200 = sma200 ? ((price - sma200) / sma200) * 100 : null
  const analystGap    = analystTarget ? ((analystTarget - price) / price) * 100 : null

  return [
    {
      label: 'Within 3% of 200 SMA or below',
      pass:  pctFromSma200 != null && pctFromSma200 <= 3,
      value: pctFromSma200 != null ? (pctFromSma200 <= 0 ? 'Below' : `+${pctFromSma200.toFixed(1)}%`) : '—',
    },
    {
      label: 'Analyst consensus >20% above price',
      pass:  analystGap != null && analystGap > 20,
      value: analystGap != null ? `+${analystGap.toFixed(0)}%` : '—',
    },
    {
      label: 'No Bucket C news (24h)',
      pass:  !hasBucketCNews,
      value: hasBucketCNews ? 'Alert' : 'Clear',
    },
    {
      label: 'QQQ not down >1.5%',
      pass:  qqqPctChange > -1.5,
      value: `${qqqPctChange >= 0 ? '+' : ''}${qqqPctChange.toFixed(1)}%`,
    },
    {
      label: 'VIX below 30',
      pass:  vix < 30,
      value: vix.toFixed(1),
    },
    {
      label: 'Not within 3 days of earnings',
      pass:  daysToEarnings > 3,
      value: `${daysToEarnings}d`,
    },
  ]
}
