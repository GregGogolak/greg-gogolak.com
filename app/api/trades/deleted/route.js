import { getRedis } from '@/lib/redis'
import { safeParse } from '@/lib/safeParse'
import { getUserId } from '@/lib/auth'

// GET — return deleted trades sorted by deleted_at descending
export async function GET() {
  try {
    const userId = await getUserId()
    const redis = getRedis()
    if (!redis) return Response.json([])
    const raw = await redis.get(`trades-deleted:${userId}`)
    const deleted = safeParse(raw) ?? []
    deleted.sort((a, b) => new Date(b.deleted_at) - new Date(a.deleted_at))
    return Response.json(deleted)
  } catch (err) {
    console.error('[/api/trades/deleted GET]', err)
    return Response.json([])
  }
}

// POST — soft-delete: append to trades-deleted, remove from trades
export async function POST(req) {
  try {
    const userId = await getUserId()
    const redis = getRedis()
    const { trade } = await req.json()
    if (!trade) return Response.json({ error: 'trade is required' }, { status: 400 })

    if (!redis) return Response.json({ ok: true })

    const TRADES_KEY = `trades:${userId}`
    const DELETED_KEY = `trades-deleted:${userId}`

    const [rawTrades, rawDeleted] = await Promise.all([
      redis.get(TRADES_KEY),
      redis.get(DELETED_KEY),
    ])

    const trades = safeParse(rawTrades) ?? []
    const deleted = safeParse(rawDeleted) ?? []

    const filteredTrades = trades.filter(t => t.id !== trade.id)
    const newDeleted = [...deleted, { ...trade, deleted_at: new Date().toISOString() }]

    await Promise.all([
      redis.set(TRADES_KEY, JSON.stringify(filteredTrades)),
      redis.set(DELETED_KEY, JSON.stringify(newDeleted)),
    ])

    return Response.json({ ok: true })
  } catch (err) {
    console.error('[/api/trades/deleted POST]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// DELETE — permanent delete (permanent: true) or restore (permanent: false)
export async function DELETE(req) {
  try {
    const userId = await getUserId()
    const redis = getRedis()
    const { id, permanent } = await req.json()
    if (!id) return Response.json({ error: 'id is required' }, { status: 400 })

    if (!redis) return Response.json({ ok: true })

    const TRADES_KEY = `trades:${userId}`
    const DELETED_KEY = `trades-deleted:${userId}`

    const rawDeleted = await redis.get(DELETED_KEY)
    const deleted = safeParse(rawDeleted) ?? []
    const trade = deleted.find(t => t.id === id)
    const newDeleted = deleted.filter(t => t.id !== id)

    if (permanent) {
      await redis.set(DELETED_KEY, JSON.stringify(newDeleted))
    } else {
      // Restore: remove from bin, re-append to trades without deleted_at
      const rawTrades = await redis.get(TRADES_KEY)
      const trades = safeParse(rawTrades) ?? []
      if (trade) {
        const { deleted_at, ...original } = trade
        await Promise.all([
          redis.set(DELETED_KEY, JSON.stringify(newDeleted)),
          redis.set(TRADES_KEY, JSON.stringify([...trades, original])),
        ])
      } else {
        await redis.set(DELETED_KEY, JSON.stringify(newDeleted))
      }
    }

    return Response.json({ ok: true })
  } catch (err) {
    console.error('[/api/trades/deleted DELETE]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
