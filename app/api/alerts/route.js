import { Redis } from '@upstash/redis'

const KEYS = {
  config:       'alerts:config',
  customLevels: 'alerts:custom-levels',
}

const CONFIG_DEFAULTS = {
  priceDrop:       true,
  interestErosion: true,
  oilMove:         true,
  earnings14d:     true,
  earnings3d:      true,
}

function getRedis() {
  if (!process.env.UPSTASH_REDIS_REST_URL) return null
  return new Redis({
    url:   process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
}

// Upstash auto-deserializes JSON — handle both string and parsed forms
function safeparse(val, fallback) {
  if (val === null || val === undefined) return fallback
  if (typeof val === 'string') {
    try { return JSON.parse(val) } catch { return fallback }
  }
  return val // already an object/array from Upstash
}

export async function GET() {
  try {
    const redis = getRedis()
    if (!redis) return Response.json({ config: CONFIG_DEFAULTS, customLevels: [] })

    const [rawConfig, rawLevels] = await Promise.all([
      redis.get(KEYS.config),
      redis.get(KEYS.customLevels),
    ])

    const config       = { ...CONFIG_DEFAULTS, ...safeparse(rawConfig, {}) }
    const customLevels = safeparse(rawLevels, [])

    return Response.json({ config, customLevels })
  } catch (err) {
    console.error('[/api/alerts GET]', err)
    return Response.json({ config: CONFIG_DEFAULTS, customLevels: [] })
  }
}

export async function POST(req) {
  try {
    const redis = getRedis()
    const { action, payload } = await req.json()

    if (!redis) return Response.json({ ok: true, warning: 'KV not configured' })

    switch (action) {
      case 'setConfig': {
        await redis.set(KEYS.config, JSON.stringify(payload))
        return Response.json({ ok: true })
      }

      case 'addLevel': {
        const raw     = await redis.get(KEYS.customLevels)
        const current = safeparse(raw, [])
        const level   = {
          id:        crypto.randomUUID(),
          price:     parseFloat(payload.price),
          direction: payload.direction || 'above',
          label:     payload.label || '',
        }
        await redis.set(KEYS.customLevels, JSON.stringify([...current, level]))
        return Response.json({ ok: true, level })
      }

      case 'removeLevel': {
        const raw      = await redis.get(KEYS.customLevels)
        const current  = safeparse(raw, [])
        const filtered = current.filter(l => l.id !== payload.id)
        await redis.set(KEYS.customLevels, JSON.stringify(filtered))
        return Response.json({ ok: true })
      }

      default:
        return Response.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (err) {
    console.error('[/api/alerts POST]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
