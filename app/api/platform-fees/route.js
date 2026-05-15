import { getRedis } from '@/lib/redis'
import { safeParse } from '@/lib/safeParse'
import { auth, clerkClient } from '@clerk/nextjs/server'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const redis = getRedis()

    // Check cache first (5-minute TTL)
    const cacheKey = `platform-fees-v2:${userId}`
    const cached = safeParse(await redis.get(cacheKey))
    if (cached) return Response.json(cached)

    const client = await clerkClient()
    const { data: users } = await client.users.getUserList({ limit: 20 })

    // Build a map of date -> { buy: [], sell: [] }
    // Buy and sell are tracked separately so fees split only among same-side users.
    // A same-day round-trip pushes the user into BOTH buckets on that date.
    const dateMap = {}

    await Promise.all(users.map(async (user) => {
      try {
        const raw = await redis.get(`trades:${user.id}`)
        const trades = safeParse(raw) ?? []
        const tradeArray = Array.isArray(trades) ? trades : []

        const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
        const isCurrentUser = user.id === userId
        const entry = { userId: user.id, name: fullName, isCurrentUser }

        tradeArray.forEach(trade => {
          // Buy side
          if (trade.buy_date) {
            if (!dateMap[trade.buy_date]) dateMap[trade.buy_date] = { buy: [], sell: [] }
            if (!dateMap[trade.buy_date].buy.find(u => u.userId === user.id)) {
              dateMap[trade.buy_date].buy.push(entry)
            }
          }
          // Sell side (always, including same-day trades)
          if (trade.sell_date) {
            if (!dateMap[trade.sell_date]) dateMap[trade.sell_date] = { buy: [], sell: [] }
            if (!dateMap[trade.sell_date].sell.find(u => u.userId === user.id)) {
              dateMap[trade.sell_date].sell.push(entry)
            }
          }
        })
      } catch {}
    }))

    // For each date, emit per-side user counts and names of OTHER users
    const result = {}
    Object.entries(dateMap).forEach(([date, { buy, sell }]) => {
      result[date] = {
        buyUsers:      buy.length,
        sellUsers:     sell.length,
        buySharedWith: buy.filter(u => !u.isCurrentUser).map(u => u.name),
        sellSharedWith: sell.filter(u => !u.isCurrentUser).map(u => u.name),
      }
    })

    const payload = { dateMap: result }
    await redis.set(cacheKey, JSON.stringify(payload), { ex: 300 })
    return Response.json(payload)
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
