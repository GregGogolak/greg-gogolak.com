import { getRedis } from '@/lib/redis'
import { safeParse } from '@/lib/safeParse'
import { calculateTrade } from '@/lib/tradeCalculations'
import { getUserId } from '@/lib/auth'

function validateInputs({ buy_price, sell_price, shares, buy_date, sell_date, type }) {
  if (!buy_date || !sell_date) return 'All fields are required'
  if (new Date(sell_date) < new Date(buy_date)) return 'sell_date must be >= buy_date'
  if (!Number.isFinite(Number(buy_price))  || Number(buy_price)  <= 0) return 'buy_price must be a positive number'
  if (!Number.isFinite(Number(sell_price)) || Number(sell_price) <= 0) return 'sell_price must be a positive number'
  if (!Number.isFinite(Number(shares))     || Number(shares)     <= 0) return 'shares must be a positive number'
  if (type && !['SCALP', 'CONVICTION'].includes(type)) return 'type must be SCALP or CONVICTION'
  return null
}

// ── GET — return all trades sorted by sell_date descending ─────────────────
export async function GET() {
  try {
    const userId = await getUserId()
    const TRADES_KEY = `trades:${userId}`

    const redis = getRedis()
    if (!redis) return Response.json([])
    const raw    = await redis.get(TRADES_KEY)
    const trades = safeParse(raw, [])
    trades.sort((a, b) => new Date(b.sell_date) - new Date(a.sell_date))
    return Response.json(trades)
  } catch (err) {
    console.error('[/api/trades GET]', err)
    return Response.json([])
  }
}

// ── POST — validate, calculate, append, save ───────────────────────────────
export async function POST(req) {
  try {
    const userId = await getUserId()
    const TRADES_KEY = `trades:${userId}`

    const redis = getRedis()
    const body  = await req.json()
    const { buy_price, sell_price, shares, buy_date, sell_date, type = 'SCALP' } = body

    const err = validateInputs(body)
    if (err) return Response.json({ error: err }, { status: 400 })

    const calc = calculateTrade({
      buy_price:  Number(buy_price),
      sell_price: Number(sell_price),
      shares:     Number(shares),
      buy_date,
      sell_date,
    })

    const trade = {
      id:         crypto.randomUUID(),
      created_at: new Date().toISOString(),
      ticker:     'NVDA',
      type,
      buy_date,
      sell_date,
      buy_price:  Number(buy_price),
      sell_price: Number(sell_price),
      shares:     Number(shares),
      ...calc,
    }

    if (!redis) return Response.json(trade)

    const existing = safeParse(await redis.get(TRADES_KEY), [])
    await redis.set(TRADES_KEY, JSON.stringify([...existing, trade]))
    return Response.json(trade)
  } catch (err) {
    console.error('[/api/trades POST]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// ── PUT — find by id, recalculate, update, save ────────────────────────────
export async function PUT(req) {
  try {
    const userId = await getUserId()
    const TRADES_KEY = `trades:${userId}`

    const redis = getRedis()
    const body  = await req.json()
    const { id, buy_price, sell_price, shares, buy_date, sell_date, type = 'SCALP' } = body

    if (!id) return Response.json({ error: 'id is required' }, { status: 400 })

    const err = validateInputs(body)
    if (err) return Response.json({ error: err }, { status: 400 })

    const calc = calculateTrade({
      buy_price:  Number(buy_price),
      sell_price: Number(sell_price),
      shares:     Number(shares),
      buy_date,
      sell_date,
    })

    if (!redis) return Response.json({ ok: true })

    const existing = safeParse(await redis.get(TRADES_KEY), [])
    const idx = existing.findIndex(t => t.id === id)
    if (idx === -1) return Response.json({ error: 'Trade not found' }, { status: 404 })

    const updated    = [...existing]
    updated[idx]     = {
      ...existing[idx],
      type,
      buy_date,
      sell_date,
      buy_price:  Number(buy_price),
      sell_price: Number(sell_price),
      shares:     Number(shares),
      ...calc,
    }
    await redis.set(TRADES_KEY, JSON.stringify(updated))
    return Response.json(updated[idx])
  } catch (err) {
    console.error('[/api/trades PUT]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// ── DELETE — find by id, remove, save ─────────────────────────────────────
export async function DELETE(req) {
  try {
    const userId = await getUserId()
    const TRADES_KEY = `trades:${userId}`

    const redis = getRedis()
    const { id } = await req.json()
    if (!id) return Response.json({ error: 'id is required' }, { status: 400 })

    if (!redis) return Response.json({ ok: true })

    const existing = safeParse(await redis.get(TRADES_KEY), [])
    const filtered = existing.filter(t => t.id !== id)
    await redis.set(TRADES_KEY, JSON.stringify(filtered))
    return Response.json({ ok: true })
  } catch (err) {
    console.error('[/api/trades DELETE]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
