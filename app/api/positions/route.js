import { getRedis } from '@/lib/redis'
import { safeParse } from '@/lib/safeParse'
import { getUserId, getUserRole } from '@/lib/auth'
import { calculateTrade } from '@/lib/tradeCalculations'

// Iran status is shared across all users — not namespaced
const IRAN_KEY = 'iran:status'

const DEFAULTS = { positions: [], cash: 0, iranStatus: 'ESCALATING' }

async function readAll(redis, posKey, cashKey) {
  if (!redis) return DEFAULTS
  const [rawPositions, rawCash, rawIran] = await Promise.all([
    redis.get(posKey),
    redis.get(cashKey),
    redis.get(IRAN_KEY),
  ])
  return {
    positions:  safeParse(rawPositions, []),
    cash:       parseFloat(rawCash || '0'),
    iranStatus: rawIran || 'ESCALATING',
  }
}

// ── GET — full state ───────────────────────────────────────────────────────
export async function GET() {
  try {
    const userId = await getUserId()
    const POSITIONS_KEY = `positions:${userId}`
    const CASH_KEY = `cash:${userId}`

    const redis = getRedis()
    const data  = await readAll(redis, POSITIONS_KEY, CASH_KEY)
    return Response.json(data)
  } catch (err) {
    console.error('[/api/positions GET]', err)
    return Response.json(DEFAULTS)
  }
}

// ── POST — mutations ───────────────────────────────────────────────────────
export async function POST(req) {
  try {
    const userId = await getUserId()
    const POSITIONS_KEY = `positions:${userId}`
    const CASH_KEY = `cash:${userId}`

    const redis = getRedis()
    const { action, payload } = await req.json()

    if (!redis) return Response.json({ ok: true, warning: 'KV not configured — changes not persisted' })

    switch (action) {
      case 'add': {
        const current = safeParse(await redis.get(POSITIONS_KEY), [])
        const newPos  = { ...payload, id: crypto.randomUUID(), status: 'OPEN' }
        const updated = [...current, newPos]
        await redis.set(POSITIONS_KEY, JSON.stringify(updated))
        // Return updated list so client can sync without a second fetch
        return Response.json({ ok: true, positions: updated })
      }

      case 'remove': {
        const current  = safeParse(await redis.get(POSITIONS_KEY), [])
        const filtered = current.filter(p => p.id !== payload.id)
        await redis.set(POSITIONS_KEY, JSON.stringify(filtered))
        return Response.json({ ok: true, positions: filtered })
      }

      case 'setVisible': {
        // payload: { id: string, value: boolean } — admin-only: toggle whether
        // this position shows in the public ledger. Only ever mutates the
        // caller's own positions.
        const role = await getUserRole()
        if (role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 })

        const current = safeParse(await redis.get(POSITIONS_KEY), [])
        const updated = current.map(p =>
          p.id === payload.id ? { ...p, publicVisible: payload.value } : p
        )
        await redis.set(POSITIONS_KEY, JSON.stringify(updated))
        return Response.json({ ok: true, positions: updated })
      }

      case 'setCash': {
        // payload: { cash: number }
        await redis.set(CASH_KEY, String(payload.cash))
        return Response.json({ ok: true })
      }

      case 'setIran': {
        // payload: { status: string }
        await redis.set(IRAN_KEY, payload.status)
        return Response.json({ ok: true })
      }

      default:
        return Response.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (err) {
    console.error('[/api/positions POST]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// ── DELETE — close a position and create a closed trade record ─────────────
export async function DELETE(request) {
  try {
    const userId = await getUserId()
    const POSITIONS_KEY = `positions:${userId}`
    const TRADES_KEY    = `trades:${userId}`

    const { positionId, exitPrice, exitDate } = await request.json()
    if (!positionId || !exitPrice || !exitDate) {
      return Response.json({ error: 'positionId, exitPrice, and exitDate are required' }, { status: 400 })
    }

    const redis = getRedis()

    // Positions are stored as a flat array
    const positions = safeParse(await redis.get(POSITIONS_KEY), [])
    const position  = positions.find(p => p.id === positionId)
    if (!position) return Response.json({ error: 'Position not found' }, { status: 404 })

    // Calculate final P&L with real exit numbers
    const result = calculateTrade({
      buy_price:  position.entryPrice,
      sell_price: parseFloat(exitPrice),
      shares:     position.shares,
      buy_date:   position.entryDate,
      sell_date:  exitDate,
    })

    // Build the closed trade record
    const closedTrade = {
      id:         crypto.randomUUID(),
      created_at: new Date().toISOString(),
      ticker:     'NVDA',
      type:       position.type ?? 'CONVICTION',
      buy_date:   position.entryDate,
      sell_date:  exitDate,
      buy_price:  position.entryPrice,
      sell_price: parseFloat(exitPrice),
      shares:     position.shares,
      ...result,
    }

    // Prepend to trades list
    const trades = safeParse(await redis.get(TRADES_KEY), [])
    await redis.set(TRADES_KEY, JSON.stringify([closedTrade, ...trades]))

    // Remove from open positions
    const updatedPositions = positions.filter(p => p.id !== positionId)
    await redis.set(POSITIONS_KEY, JSON.stringify(updatedPositions))

    return Response.json({ success: true, trade: closedTrade })
  } catch (err) {
    console.error('[/api/positions DELETE]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
