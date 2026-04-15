import { getRedis } from '@/lib/redis'

const AV_KEY = process.env.ALPHA_VANTAGE_API_KEY
const CACHE_KEY    = 'fundamentals:nvda'
const CACHE_TTL_MS = 6 * 60 * 60 * 1000  // 6 hours

export async function GET() {
  try {
    const redis = getRedis()

    // Try KV cache first
    if (redis) {
      const cached = await redis.get(CACHE_KEY)
      if (cached) {
        const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached
        if (Date.now() - parsed.ts < CACHE_TTL_MS) return Response.json(parsed)
      }
    }

    // Fetch from Alpha Vantage
    const res  = await fetch(
      `https://www.alphavantage.co/query?function=OVERVIEW&symbol=NVDA&apikey=${AV_KEY}`,
      { cache: 'no-store' }
    )
    const data = await res.json()

    if (!data.Symbol) throw new Error('AV OVERVIEW returned no data — rate limit?')

    const analystTarget = parseFloat(data.AnalystTargetPrice) || null
    const result = {
      analystTarget,
      forwardPE:   parseFloat(data.ForwardPE) || null,
      eps:         parseFloat(data.EPS) || null,
      fiftyTwoWeekHigh: parseFloat(data['52WeekHigh']) || null,
      fiftyTwoWeekLow:  parseFloat(data['52WeekLow'])  || null,
      ts: Date.now(),
    }

    // Store in KV
    if (redis) await redis.set(CACHE_KEY, JSON.stringify(result))

    return Response.json(result)
  } catch (err) {
    console.error('[/api/fundamentals]', err)
    // Return hardcoded consensus if API unavailable (Phase 1 fallback)
    return Response.json({ analystTarget: 264, ts: Date.now(), fallback: true })
  }
}
