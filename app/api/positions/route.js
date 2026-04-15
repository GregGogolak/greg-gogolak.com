import { getRedis } from '@/lib/redis'
import { safeParse } from '@/lib/safeParse'
import { getUserId } from '@/lib/auth'

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
