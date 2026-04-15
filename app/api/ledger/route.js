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
          .slice(0, 5)

        return {
          userId: uid,
          name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.emailAddresses[0]?.emailAddress,
          role,
          openPositions: positions,
          cash,
          totalNetEur,
          winRate,
          tradeCount: trades.length,
          recentTrades,
        }
      })
    )

    // Sort by total net EUR descending
    members.sort((a, b) => b.totalNetEur - a.totalNetEur)

    return Response.json({ members })
  } catch (err) {
    console.error('[/api/ledger]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
