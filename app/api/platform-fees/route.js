import { getRedis } from '@/lib/redis'
import { safeParse } from '@/lib/safeParse'
import { auth, clerkClient } from '@clerk/nextjs/server'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const redis = getRedis()

    // Check cache first (5-minute TTL)
    const cacheKey = `platform-fees:${userId}`
    const cached = safeParse(await redis.get(cacheKey))
    if (cached) return Response.json(cached)

    const client = await clerkClient()
    const { data: users } = await client.users.getUserList({ limit: 20 })

    // Build a map of date -> array of user entries who transacted on that date
    const dateMap = {}

    await Promise.all(users.map(async (user) => {
      try {
        const raw = await redis.get(`trades:${user.id}`)
        const trades = safeParse(raw) ?? []
        const tradeArray = Array.isArray(trades) ? trades : []

        const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
        const isCurrentUser = user.id === userId

        tradeArray.forEach(trade => {
          // Buy date
          if (trade.buy_date) {
            if (!dateMap[trade.buy_date]) dateMap[trade.buy_date] = []
            if (!dateMap[trade.buy_date].find(u => u.userId === user.id)) {
              dateMap[trade.buy_date].push({
                userId: user.id,
                name: fullName,
                isCurrentUser,
              })
            }
          }
          // Sell date (only if different from buy date)
          if (trade.sell_date && trade.sell_date !== trade.buy_date) {
            if (!dateMap[trade.sell_date]) dateMap[trade.sell_date] = []
            if (!dateMap[trade.sell_date].find(u => u.userId === user.id)) {
              dateMap[trade.sell_date].push({
                userId: user.id,
                name: fullName,
                isCurrentUser,
              })
            }
          }
        })
      } catch {}
    }))

    // For each date, return totalUsers, names of OTHER users, and splitFactor
    const result = {}
    Object.entries(dateMap).forEach(([date, users]) => {
      result[date] = {
        totalUsers: users.length,
        sharedWith: users.filter(u => !u.isCurrentUser).map(u => u.name),
        splitFactor: users.length,
      }
    })

    const payload = { dateMap: result }
    await redis.set(cacheKey, JSON.stringify(payload), { ex: 300 })
    return Response.json(payload)
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
