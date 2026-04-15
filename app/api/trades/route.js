import { getRedis } from '@/lib/redis'
import { calculateTrade } from '@/lib/tradeCalculations'

const TRADES_KEY = 'nvda_trades'

/**
 * Upstash auto-deserialises JSON on read, so redis.get() may return an already-
 * parsed object rather than a string. Handle both forms to avoid JSON.parse errors.
 */
function safeparse(val, fallback) {
  if (val === null || val === undefined) return fallback
  if (typeof val === 'string') {
    try { return JSON.parse(val) } catch { return fallback }
  }
  return val  // already deserialised by Upstash
}

function validateInputs({ buy_price, sell_price, shares, buy_date, sell_date, type }) {
  if (!buy_date || !sell_date || !type) return 'All fields are required'
  if (new Date(sell_date) < new Date(buy_date)) return 'sell_date must be >= buy_date'
  if (!Number.isFinite(Number(buy_price))  || Number(buy_price)  <= 0) return 'buy_price must be a positive number'
  if (!Number.isFinite(Number(sell_price)) || Number(sell_price) <= 0) return 'sell_price must be a positive number'
  if (!Number.isFinite(Number(shares))     || Number(shares)     <= 0) return 'shares must be a positive number'
  if (!['SCALP', 'CONVICTION'].includes(type)) return 'type must be SCALP or CONVICTION'
  return null
}

// ── GET — return all trades sorted by sell_date descending ─────────────────
export async function GET() {
  try {
    const redis = getRedis()
    if (!redis) return Response.json([])
    const raw    = await redis.get(TRADES_KEY)
    const trades = safeparse(raw, [])
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
    const redis = getRedis()
    const body  = await req.json()
    const { buy_price, sell_price, shares, buy_date, sell_date, type } = body

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

    const existing = safeparse(await redis.get(TRADES_KEY), [])
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
    const redis = getRedis()
    const body  = await req.json()
    const { id, buy_price, sell_price, shares, buy_date, sell_date, type } = body

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

    const existing = safeparse(await redis.get(TRADES_KEY), [])
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
    const redis = getRedis()
    const { id } = await req.json()
    if (!id) return Response.json({ error: 'id is required' }, { status: 400 })

    if (!redis) return Response.json({ ok: true })

    const existing = safeparse(await redis.get(TRADES_KEY), [])
    const filtered = existing.filter(t => t.id !== id)
    await redis.set(TRADES_KEY, JSON.stringify(filtered))
    return Response.json({ ok: true })
  } catch (err) {
    console.error('[/api/trades DELETE]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
