const FINNHUB = 'https://finnhub.io/api/v1'
const AV      = 'https://www.alphavantage.co/query'
const FH_KEY  = process.env.FINNHUB_API_KEY
const AV_KEY  = process.env.ALPHA_VANTAGE_API_KEY

// Separate caches with longer TTLs to stay within AV 25 calls/day
let cache       = { data: null, ts: 0 }
let brentCache  = { data: null, ts: 0 }
let vixCache    = { data: null, ts: 0 }

const MACRO_TTL = 5  * 60_000   // 5 min  — QQQ quote, cheap Finnhub call
const BRENT_TTL = 2  * 3600_000 // 2 hrs  — AV BRENT, budget ~12 calls/day
const VIX_TTL   = 10 * 60_000   // 10 min — Yahoo Finance, no key limit

/**
 * QQQ via Finnhub (works on free tier)
 */
async function fetchQQQ() {
  const res  = await fetch(`${FINNHUB}/quote?symbol=QQQ&token=${FH_KEY}`, { cache: 'no-store' })
  const data = await res.json()
  return data?.c ? data : null
}

/**
 * Brent crude via Alpha Vantage BRENT commodity function.
 * Returns last 3 data points (for 2-session change calc).
 * Cached 2hrs to stay within 25 calls/day budget.
 */
async function fetchBrent() {
  if (Date.now() - brentCache.ts < BRENT_TTL && brentCache.data) return brentCache.data

  const res  = await fetch(
    `${AV}?function=BRENT&interval=daily&apikey=${AV_KEY}`,
    { cache: 'no-store' }
  )
  const json = await res.json()
  const data = json?.data
  if (!data || data.length < 3) return null

  const result = {
    price:          parseFloat(data[0].value),
    prevPrice:      parseFloat(data[1].value),
    twoSessionPct:  ((parseFloat(data[0].value) - parseFloat(data[2].value)) / parseFloat(data[2].value)) * 100,
    pctChange:      ((parseFloat(data[0].value) - parseFloat(data[1].value)) / parseFloat(data[1].value)) * 100,
  }

  brentCache = { data: result, ts: Date.now() }
  return result
}

/**
 * VIX via Yahoo Finance chart API.
 * No API key required. 10-minute cache.
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
