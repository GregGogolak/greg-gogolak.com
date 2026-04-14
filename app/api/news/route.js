const FINNHUB = 'https://finnhub.io/api/v1'
const KEY     = process.env.FINNHUB_API_KEY

let cache = { data: null, ts: 0 }
const TTL = 14 * 60_000  // 14 minutes

function yyyymmdd(date) {
  return date.toISOString().split('T')[0]
}

export async function GET() {
  if (Date.now() - cache.ts < TTL && cache.data) return Response.json(cache.data)

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
      .map(a => ({
        id:       a.id,
        headline: a.headline,
        summary:  a.summary,
        url:      a.url,
        source:   a.source,
        image:    a.image || null,
        datetime: a.datetime,
      }))

    const result = { articles: sorted, lastUpdated: Date.now() }
    cache = { data: result, ts: Date.now() }
    return Response.json(result)
  } catch (err) {
    console.error('[/api/news]', err)
    return Response.json({ articles: [], error: err.message }, { status: 500 })
  }
}
