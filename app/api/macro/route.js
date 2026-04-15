const FINNHUB  = 'https://finnhub.io/api/v1'
const AV       = 'https://www.alphavantage.co/query'
const OIL_BASE = 'https://api.oilpriceapi.com/v1'
const TD       = 'https://api.twelvedata.com'
const FH_KEY   = process.env.FINNHUB_API_KEY
const AV_KEY   = process.env.ALPHA_VANTAGE_API_KEY
const OIL_KEY  = process.env.OIL_PRICE_API_KEY
const TD_KEY   = process.env.TWELVE_DATA_API_KEY

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
 * Brent crude via OilPriceAPI latest endpoint.
 * The historical /prices endpoint returns empty on the free tier.
 * The latest endpoint includes changes.24h with pctChange and previous_price.
 * twoSessionPct not available from this tier — returns null.
 * Cached 5 min — oil moves fast.
 */
async function fetchBrent() {
  if (Date.now() - brentCache.ts < BRENT_TTL && brentCache.data) return brentCache.data

  try {
    const res  = await fetch(
      `${OIL_BASE}/prices/latest?by_code=BRENT_USD`,
      {
        cache: 'no-store',
        headers: { 'Authorization': 'Token ' + OIL_KEY, 'Content-Type': 'application/json' },
      }
    )
    const json = await res.json()
    if (json?.status !== 'success') return null
    const d = json?.data
    if (!d?.price) return null

    const today     = parseFloat(d.price)
    const h24       = d.changes?.['24h']
    const yesterday = h24?.previous_price ? parseFloat(h24.previous_price) : null
    const pctChange = h24?.percent        ? parseFloat(h24.percent)        : null

    const result = {
      price:         today,
      prevPrice:     yesterday,
      pctChange,
      twoSessionPct: null, // not available on free tier
    }

    brentCache = { data: result, ts: Date.now() }
    return result
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
