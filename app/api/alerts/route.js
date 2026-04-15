import { getRedis } from '@/lib/redis'
import { safeParse } from '@/lib/safeParse'

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

export async function GET() {
  try {
    const redis = getRedis()
    if (!redis) return Response.json({ config: CONFIG_DEFAULTS, customLevels: [] })

    const [rawConfig, rawLevels] = await Promise.all([
      redis.get(KEYS.config),
      redis.get(KEYS.customLevels),
    ])

    const config       = { ...CONFIG_DEFAULTS, ...safeParse(rawConfig, {}) }
    const customLevels = safeParse(rawLevels, [])

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
        const current = safeParse(raw, [])
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
        const current  = safeParse(raw, [])
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
