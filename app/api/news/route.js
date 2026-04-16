import { classifyWithKeywords, scoreArticle } from '@/lib/newsClassifier'
import { getRedis } from '@/lib/redis'
import { safeParse } from '@/lib/safeParse'

const FINNHUB        = 'https://finnhub.io/api/v1'
const KEY            = process.env.FINNHUB_API_KEY
const NEWS_CACHE_KEY = 'news:nvda'

let cache = { data: null, ts: 0 }
const TTL   = 14 * 60_000  // 14 minutes
const TTL_S = 14 * 60      // Redis TTL in seconds

function yyyymmdd(date) {
  return date.toISOString().split('T')[0]
}

export async function GET() {
  // L1: in-memory
  if (Date.now() - cache.ts < TTL && cache.data) return Response.json(cache.data)

  // L2: Redis — survives Vercel cold starts
  const redis = getRedis()
  if (redis) {
    try {
      const parsed = safeParse(await redis.get(NEWS_CACHE_KEY))
      if (parsed && Date.now() - parsed.ts < TTL) {
        cache = { data: parsed.data, ts: parsed.ts }
        return Response.json(parsed.data)
      }
    } catch {}
  }

  try {
    const today = new Date()
    const twoDaysAgo = new Date(today - 2 * 86_400_000)

    const res  = await fetch(
      `${FINNHUB}/company-news?symbol=NVDA&from=${yyyymmdd(twoDaysAgo)}&to=${yyyymmdd(today)}&token=${KEY}`,
      { cache: 'no-store' }
    )
    const articles = await res.json()

    if (!Array.isArray(articles)) throw new Error('News response not an array')

    const sorted = articles
      .filter(a => a.headline && a.url)
      .sort((a, b) => b.datetime - a.datetime)
      .slice(0, 15)
      .map(a => {
        const bucket = classifyWithKeywords(a.headline + ' ' + (a.summary || ''))
        return scoreArticle({
          id:       a.id,
          headline: a.headline,
          summary:  a.summary,
          url:      a.url,
          source:   a.source,
          image:    a.image || null,
          datetime: a.datetime,
          bucket,
        })
      })

    const result = { articles: sorted, lastUpdated: Date.now() }

    if (redis) {
      try { await redis.set(NEWS_CACHE_KEY, JSON.stringify({ data: result, ts: Date.now() }), { ex: TTL_S }) } catch {}
    }
    cache = { data: result, ts: Date.now() }
    return Response.json(result)
  } catch (err) {
    console.error('[/api/news]', err)
    return Response.json({ articles: [], error: err.message }, { status: 500 })
  }
}
