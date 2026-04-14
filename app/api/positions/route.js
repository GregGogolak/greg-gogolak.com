import { Redis } from '@upstash/redis'

const KEYS = {
  positions: 'positions:list',
  cash:      'cash:available',
  iran:      'iran:status',
}

function getRedis() {
  if (!process.env.UPSTASH_REDIS_REST_URL) return null
  return new Redis({
    url:   process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
}

// Default state when KV unavailable
const DEFAULTS = { positions: [], cash: 0, iranStatus: 'ESCALATING' }

async function readAll(redis) {
  if (!redis) return DEFAULTS
  const [rawPositions, rawCash, rawIran] = await Promise.all([
    redis.get(KEYS.positions),
    redis.get(KEYS.cash),
    redis.get(KEYS.iran),
  ])
  return {
    positions:  JSON.parse(rawPositions || '[]'),
    cash:       parseFloat(rawCash || '0'),
    iranStatus: rawIran || 'ESCALATING',
  }
}

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

export async function POST(req) {
  try {
    const redis = getRedis()
    const { action, payload } = await req.json()

    if (!redis) return Response.json({ ok: true, warning: 'KV not configured — changes not persisted' })

    switch (action) {
      case 'add': {
        const current = JSON.parse(await redis.get(KEYS.positions) || '[]')
        const newPos  = { ...payload, id: crypto.randomUUID(), status: 'OPEN' }
        await redis.set(KEYS.positions, JSON.stringify([...current, newPos]))
        return Response.json({ ok: true, position: newPos })
      }
      case 'remove': {
        const current  = JSON.parse(await redis.get(KEYS.positions) || '[]')
        const filtered = current.filter(p => p.id !== payload.id)
        await redis.set(KEYS.positions, JSON.stringify(filtered))
        return Response.json({ ok: true })
      }
      case 'setCash': {
        await redis.set(KEYS.cash, String(payload.cash))
        return Response.json({ ok: true })
      }
      case 'setIran': {
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
