import { getRedis } from '@/lib/redis'
import { safeParse } from '@/lib/safeParse'
import { auth, clerkClient } from '@clerk/nextjs/server'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const redis = getRedis()

    // Check cache first (5-minute TTL)
    const cacheKey = `platform-fees-v3:${userId}`
    const cached = safeParse(await redis.get(cacheKey))
    if (cached) return Response.json(cached)

    const client = await clerkClient()
    const { data: users } = await client.users.getUserList({ limit: 20 })

    // Build a map of date -> { buyExecs, sellExecs, buyOtherUsers, sellOtherUsers }
    // buyExecs/sellExecs count all executions (one per trade, not per user).
    // buyOtherUsers/sellOtherUsers are keyed by userId so names are auto-deduplicated.
    // Same-day round-trips increment both counters and add the user to both sets.
    const dateMap = {}

    await Promise.all(users.map(async (user) => {
      try {
        const raw = await redis.get(`trades:${user.id}`)
        const trades = safeParse(raw) ?? []
        const tradeArray = Array.isArray(trades) ? trades : []

        const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
        const isCurrentUser = user.id === userId

        tradeArray.forEach(trade => {
          // Buy side — one execution per trade
          if (trade.buy_date) {
            if (!dateMap[trade.buy_date]) {
              dateMap[trade.buy_date] = { buyExecs: 0, sellExecs: 0, buyOtherUsers: {}, sellOtherUsers: {} }
            }
            dateMap[trade.buy_date].buyExecs++
            if (!isCurrentUser) dateMap[trade.buy_date].buyOtherUsers[user.id] = fullName
          }
          // Sell side — one execution per trade (always, including same-day)
          if (trade.sell_date) {
            if (!dateMap[trade.sell_date]) {
              dateMap[trade.sell_date] = { buyExecs: 0, sellExecs: 0, buyOtherUsers: {}, sellOtherUsers: {} }
            }
            dateMap[trade.sell_date].sellExecs++
            if (!isCurrentUser) dateMap[trade.sell_date].sellOtherUsers[user.id] = fullName
          }
        })
      } catch {}
    }))

    // For each date, emit per-side execution counts and deduplicated OTHER-user name lists
    const result = {}
    Object.entries(dateMap).forEach(([date, { buyExecs, sellExecs, buyOtherUsers, sellOtherUsers }]) => {
      result[date] = {
        buyExecutions:  buyExecs,
        sellExecutions: sellExecs,
        buySharedWith:  Object.values(buyOtherUsers),
        sellSharedWith: Object.values(sellOtherUsers),
      }
    })

    const payload = { dateMap: result }
    await redis.set(cacheKey, JSON.stringify(payload), { ex: 300 })
    return Response.json(payload)
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
