import { getRedis } from '@/lib/redis'
import { safeParse } from '@/lib/safeParse'
import { auth, clerkClient } from '@clerk/nextjs/server'

function buildEquityCurve(trades) {
  if (!trades || trades.length === 0) return []
  const sorted = [...trades].sort((a, b) =>
    new Date(a.sell_date) - new Date(b.sell_date)
  )
  let cumulative = 0
  const points = [{ date: sorted[0].buy_date, value: 0 }]
  sorted.forEach(trade => {
    cumulative += trade.net_eur ?? 0
    points.push({ date: trade.sell_date, value: Math.round(cumulative) })
  })
  return points
}

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return Response.json({ error: 'Unauthenticated' }, { status: 401 })

    const redis = getRedis()
    if (!redis) return Response.json({ members: [] })

    // Get all users from Clerk
    const client = await clerkClient()
    const { data: users } = await client.users.getUserList({ limit: 20 })

    // For each user, fetch their positions and trades from Redis
    const members = await Promise.all(
      users.map(async (user) => {
        const uid = user.id
        const role = user.publicMetadata?.role ?? user.privateMetadata?.role ?? 'member'

        const [rawPositions, rawCash, rawTrades] = await Promise.all([
          redis.get(`positions:${uid}`),
          redis.get(`cash:${uid}`),
          redis.get(`trades:${uid}`),
        ])

        const positions = safeParse(rawPositions) ?? []
        const cash = parseFloat(safeParse(rawCash) ?? 0)
        const trades = safeParse(rawTrades) ?? []

        // Calculate stats
        const totalNetEur = trades.reduce((sum, t) => sum + (t.net_eur ?? 0), 0)
        const totalGrossUsd = trades.reduce((sum, t) => sum + (t.gross_pnl_usd ?? 0), 0)
        const winRate = trades.length > 0
          ? Math.round((trades.filter(t => t.net_eur > 0).length / trades.length) * 100)
          : null
        const recentTrades = [...trades]
          .sort((a, b) => new Date(b.sell_date) - new Date(a.sell_date))
          .slice(0, 10)

        // Full trade objects kept for fundStats.bestTradeEver
        const bestTradeObj = trades.length > 0
          ? trades.reduce((best, t) => t.net_eur > (best?.net_eur ?? -Infinity) ? t : best, null)
          : null

        // This month net EUR — string prefix avoids timezone ambiguity with Date parsing
        const thisMonthPrefix = new Date().toISOString().slice(0, 7) // "YYYY-MM"
        const thisMonth = trades.filter(t =>
          typeof t.sell_date === 'string' && t.sell_date.startsWith(thisMonthPrefix)
        )
        const thisMonthNet = thisMonth.reduce((s, t) => s + (t.net_eur ?? 0), 0)

        // Current win streak (descending sort)
        const sortedDesc = [...trades].sort((a, b) => new Date(b.sell_date) - new Date(a.sell_date))
        let streak = 0
        for (const t of sortedDesc) {
          if (t.net_eur > 0) streak++
          else break
        }

        // Ascending sort for equity curve and drawdown
        const sortedAsc = [...trades].sort((a, b) => new Date(a.sell_date) - new Date(b.sell_date))

        const maxDrawdown = (() => {
          let peak = 0, maxDD = 0, cum = 0
          sortedAsc.forEach(t => {
            cum += t.net_eur ?? 0
            if (cum > peak) peak = cum
            const dd = peak - cum
            if (dd > maxDD) maxDD = dd
          })
          return -Math.round(maxDD)
        })()

        const avgHoldDays = trades.length > 0
          ? (trades.reduce((s, t) => s + (t.calendar_days ?? 1), 0) / trades.length).toFixed(1)
          : 0

        const totalFeesPaid = trades.reduce((s, t) => s + (t.total_costs_usd ?? 0), 0)

        return {
          userId: uid,
          firstName: user.firstName ?? '',
          lastName: user.lastName ?? '',
          name: (`${user.firstName ?? ''} ${user.lastName ?? ''}`).trim() ||
                user.username ||
                user.emailAddresses[0]?.emailAddress?.split('@')[0] ||
                'Unknown',
          role,
          // Positions the owner has hidden from the public ledger (publicVisible === false)
          // are excluded here; this feeds both the open-positions list and its count.
          openPositions: positions.filter(p => p.publicVisible !== false),
          cash,
          totalNetEur,
          totalGrossUsd,
          winRate,
          tradeCount: trades.length,
          totalTrades: trades.length,
          recentTrades,
          allTrades: [...trades].sort((a, b) => new Date(b.sell_date) - new Date(a.sell_date)),
          bestTrade: trades.length > 0 ? Math.round(Math.max(...trades.map(t => t.net_eur ?? 0))) : 0,
          worstTrade: trades.length > 0 ? Math.round(Math.min(...trades.map(t => t.net_eur ?? 0))) : 0,
          bestTradeObj,
          thisMonthNet,
          thisMonthPnl: thisMonthNet,
          winStreak: streak,
          equityCurve: buildEquityCurve(trades),
          maxDrawdown,
          avgHoldDays,
          totalFeesPaid,
        }
      })
    )

    // Sort by total net EUR descending
    members.sort((a, b) => b.totalNetEur - a.totalNetEur)

    // Fee share per member
    const fundTotalFees = members.reduce((s, m) => s + (m.totalFeesPaid ?? 0), 0)
    members.forEach(m => {
      m.feeShare = fundTotalFees > 0 ? (m.totalFeesPaid / fundTotalFees) * 100 : 0
    })

    // Fund-level stats
    const allTradesFlat = members.flatMap(m => m.allTrades)
    const fundWinRateVal = allTradesFlat.length > 0
      ? Math.round((allTradesFlat.filter(t => t.net_eur > 0).length / allTradesFlat.length) * 100)
      : null

    const fundStats = {
      totalNetEur: members.reduce((s, m) => s + m.totalNetEur, 0),
      totalGrossUsd: members.reduce((s, m) => s + m.totalGrossUsd, 0),
      totalTrades: members.reduce((s, m) => s + m.tradeCount, 0),
      winRate: fundWinRateVal,
      fundWinRate: fundWinRateVal,
      bestTradeEver: members.reduce((best, m) => {
        if (!m.bestTradeObj) return best
        if (!best || m.bestTradeObj.net_eur > best.net_eur) return { ...m.bestTradeObj, memberName: m.name }
        return best
      }, null),
      totalOpenPositions: members.reduce((s, m) => s + m.openPositions.length, 0),
    }

    const allOpenPositions = members
      .flatMap(m =>
        (m.openPositions ?? []).map(p => ({
          ...p,
          memberName: m.name,
          userId: m.userId,
        }))
      )
      .filter(p => p.entryPrice && p.shares)

    return Response.json({ members, fundStats, allOpenPositions })
  } catch (err) {
    console.error('[/api/ledger]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
