const FINNHUB  = 'https://finnhub.io/api/v1'
const FH_KEY   = process.env.FINNHUB_API_KEY

// Separate caches per data source
let cache       = { data: null, ts: 0 }
let brentCache  = { data: null, ts: 0 }
let vixCache    = { data: null, ts: 0 }

const MACRO_TTL = 5  * 60_000  // 5 min  — QQQ quote, cheap Finnhub call
const BRENT_TTL = 5  * 60_000  // 5 min  — OilPriceAPI, oil moves fast
const VIX_TTL   = 10 * 60_000  // 10 min — Twelve Data VIX quote

/**
 * QQQ via Finnhub (works on free tier)
 */
async function fetchQQQ() {
  const res  = await fetch(`${FINNHUB}/quote?symbol=QQQ&token=${FH_KEY}`, { cache: 'no-store' })
  const data = await res.json()
  return data?.c ? data : null
}

/**
 * Brent crude via Yahoo Finance (BZ=F futures contract).
 * OilPriceAPI free tier exhausted — Yahoo has no key requirement.
 * Same pattern as fetchVix() already in use.
 * Cached 5 min — oil moves fast.
 */
async function fetchBrent() {
  if (Date.now() - brentCache.ts < BRENT_TTL && brentCache.data) return brentCache.data

  try {
    const res  = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/BZ%3DF?interval=1d&range=5d',
      {
        cache: 'no-store',
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; nvda-jarvis/1.0)' },
      }
    )
    const json   = await res.json()
    const result = json?.chart?.result?.[0]
    if (!result) return null

    const meta      = result.meta
    const price     = meta.regularMarketPrice
    const prevClose = meta.previousClose ?? meta.chartPreviousClose
    if (!price) return null

    const pctChange = prevClose ? ((price - prevClose) / prevClose) * 100 : null

    const brent = {
      price,
      prevPrice:     prevClose ?? null,
      pctChange,
      twoSessionPct: null,
    }

    brentCache = { data: brent, ts: Date.now() }
    return brent
  } catch {
    return null
  }
}

/**
 * VIX via Yahoo Finance chart API.
 * Twelve Data does not carry the CBOE VIX index on its free tier (returns 404).
 * Yahoo Finance has no key requirement and returns reliable data.
 * 10-minute cache.
 */
async function fetchVix() {
  if (Date.now() - vixCache.ts < VIX_TTL && vixCache.data) return vixCache.data

  try {
    const res  = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=5d',
      {
        cache: 'no-store',
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; nvda-jarvis/1.0)' },
      }
    )
    const json   = await res.json()
    const result = json?.chart?.result?.[0]
    if (!result) return null

    const meta      = result.meta
    const price     = meta.regularMarketPrice
    const prevClose = meta.previousClose ?? meta.chartPreviousClose
    if (!price) return null

    const vix = {
      level:     price,
      pctChange: prevClose ? ((price - prevClose) / prevClose) * 100 : null,
      source:    'yahoo',
    }

    vixCache = { data: vix, ts: Date.now() }
    return vix
  } catch {
    return null
  }
}

export async function GET() {
  if (Date.now() - cache.ts < MACRO_TTL && cache.data) return Response.json(cache.data)

  try {
    const [qqq, brent, vix] = await Promise.all([fetchQQQ(), fetchBrent(), fetchVix()])

    const result = {
      oil: brent
        ? { price: brent.price, pctChange: brent.pctChange, twoSessionPct: brent.twoSessionPct }
        : null,
      qqq:         { pctChange: qqq?.dp ?? null },
      vix:         vix ?? null,
      lastUpdated: Date.now(),
    }

    cache = { data: result, ts: Date.now() }
    return Response.json(result)
  } catch (err) {
    console.error('[/api/macro]', err.message)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
