import { getRedis } from '@/lib/redis'
import { safeParse } from '@/lib/safeParse'
import { getUserId } from '@/lib/auth'

export async function POST(request) {
  try {
    const userId = await getUserId()
    const TRADES_KEY = `trades:${userId}`

    const { trades } = await request.json()
    if (!Array.isArray(trades) || trades.length === 0) {
      return Response.json({ error: 'No trades provided' }, { status: 400 })
    }

    const redis = getRedis()
    const raw = await redis.get(TRADES_KEY)
    const existing = safeParse(raw, [])
    const tradeArray = Array.isArray(existing) ? existing : []

    // Prepend new trades (newest first)
    const updated = [...trades, ...tradeArray]
    await redis.set(TRADES_KEY, JSON.stringify(updated))

    // Invalidate platform fees cache
    await redis.del(`platform-fees-v4:${userId}`)

    return Response.json({ success: true, imported: trades.length })
  } catch (err) {
    console.error('[/api/trades/bulk POST]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
