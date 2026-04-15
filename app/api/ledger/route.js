import { getRedis } from '@/lib/redis'
import { safeParse } from '@/lib/safeParse'
import { auth, clerkClient } from '@clerk/nextjs/server'

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
        const winRate = trades.length > 0
          ? Math.round((trades.filter(t => t.net_eur > 0).length / trades.length) * 100)
          : null
        const recentTrades = [...trades]
          .sort((a, b) => new Date(b.sell_date) - new Date(a.sell_date))
          .slice(0, 10)

        // Best single trade
        const bestTrade = trades.length > 0
          ? trades.reduce((best, t) => t.net_eur > (best?.net_eur ?? -Infinity) ? t : best, null)
          : null

        // Worst single trade
        const worstTrade = trades.length > 0
          ? trades.reduce((worst, t) => t.net_eur < (worst?.net_eur ?? Infinity) ? t : worst, null)
          : null

        // This month net EUR
        const now = new Date()
        const thisMonth = trades.filter(t => {
          const d = new Date(t.sell_date)
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
        })
        const thisMonthNet = thisMonth.reduce((s, t) => s + (t.net_eur ?? 0), 0)

        // Current win streak
        const sorted = [...trades].sort((a, b) => new Date(b.sell_date) - new Date(a.sell_date))
        let streak = 0
        for (const t of sorted) {
          if (t.net_eur > 0) streak++
          else break
        }

        return {
          userId: uid,
          name: (`${user.firstName ?? ''} ${user.lastName ?? ''}`).trim() ||
                user.username ||
                user.emailAddresses[0]?.emailAddress?.split('@')[0] ||
                'Unknown',
          role,
          openPositions: positions,
          cash,
          totalNetEur,
          winRate,
          tradeCount: trades.length,
          recentTrades,
          allTrades: [...trades].sort((a, b) => new Date(b.sell_date) - new Date(a.sell_date)),
          bestTrade,
          worstTrade,
          thisMonthNet,
          winStreak: streak,
        }
      })
    )

    // Sort by total net EUR descending
    members.sort((a, b) => b.totalNetEur - a.totalNetEur)

    // Fund-level stats (requires full trades, not trimmed recentTrades)
    const fundStats = {
      totalNetEur: members.reduce((s, m) => s + m.totalNetEur, 0),
      totalTrades: members.reduce((s, m) => s + m.tradeCount, 0),
      fundWinRate: (() => {
        const allTrades = members.flatMap(m => m.allTrades)
        const wins = allTrades.filter(t => t.net_eur > 0).length
        return allTrades.length > 0 ? Math.round((wins / allTrades.length) * 100) : null
      })(),
      bestTradeEver: members.reduce((best, m) => {
        if (!m.bestTrade) return best
        if (!best || m.bestTrade.net_eur > best.net_eur) return { ...m.bestTrade, memberName: m.name }
        return best
      }, null),
      totalOpenPositions: members.reduce((s, m) => s + m.openPositions.length, 0),
    }

    return Response.json({ members, fundStats })
  } catch (err) {
    console.error('[/api/ledger]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
