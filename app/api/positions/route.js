import { getRedis } from '@/lib/redis'
import { safeParse } from '@/lib/safeParse'

// ── Redis keys ─────────────────────────────────────────────────────────────
const KEYS = {
  positions: 'positions:list',
  cash:      'cash:available',
  iran:      'iran:status',
}

const DEFAULTS = { positions: [], cash: 0, iranStatus: 'ESCALATING' }

async function readAll(redis) {
  if (!redis) return DEFAULTS
  const [rawPositions, rawCash, rawIran] = await Promise.all([
    redis.get(KEYS.positions),
    redis.get(KEYS.cash),
    redis.get(KEYS.iran),
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
    const redis = getRedis()
    const data  = await readAll(redis)
    return Response.json(data)
  } catch (err) {
    console.error('[/api/positions GET]', err)
    return Response.json(DEFAULTS)
  }
}

// ── POST — mutations ───────────────────────────────────────────────────────
export async function POST(req) {
  try {
    const redis = getRedis()
    const { action, payload } = await req.json()

    if (!redis) return Response.json({ ok: true, warning: 'KV not configured — changes not persisted' })

    switch (action) {
      case 'add': {
        const current = safeParse(await redis.get(KEYS.positions), [])
        const newPos  = { ...payload, id: crypto.randomUUID(), status: 'OPEN' }
        const updated = [...current, newPos]
        await redis.set(KEYS.positions, JSON.stringify(updated))
        // Return updated list so client can sync without a second fetch
        return Response.json({ ok: true, positions: updated })
      }

      case 'remove': {
        const current  = safeParse(await redis.get(KEYS.positions), [])
        const filtered = current.filter(p => p.id !== payload.id)
        await redis.set(KEYS.positions, JSON.stringify(filtered))
        return Response.json({ ok: true, positions: filtered })
      }

      case 'setCash': {
        // payload: { cash: number }
        await redis.set(KEYS.cash, String(payload.cash))
        return Response.json({ ok: true })
      }

      case 'setIran': {
        // payload: { status: string }
        await redis.set(KEYS.iran, payload.status)
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
